# NPC E2/E3 – implementierungsreifer Fachplan

**Planbasis 08.11.2026 auf .168.** Die Ist-Analyse und die Gegenreviews dokumentieren die Ausgangslage. Die aktuelle Freigabegrenze steht in §14. Die Etappennamen folgen der heutigen Roadmap. Die Änderungen nach dem Planreview stehen in §§15–16. [Ist- und Ursachenanalyse](../recherche/NPC_E2_E3_ISTANALYSE_20261108.md) · [GPT-Fachplan-Gegenreview](REVIEW_NPC_E2_E3_FACHPLAN_GPT_20261108.md) · [NPC-Etappen](../07_ROADMAP_NACH_10B_ENTWURF.md#2-npc-kontinuität--neue-fachliche-reihenfolge) · [Historische NPC-Analyse](../recherche/NPC_KONTINUITAET_ANALYSE_20261104.md).

Drei getrennt baubare und abnehmbare Pakete: **E2-A Integrität**, **E2-B Kontinuität**, **E3 Persönlichkeitsanker**. Architekturvariante A und die Folge E2-A → E2-B → E3 bleiben.

---

## 1. Zielbild und Ausschlüsse

**Zielbild (spielerisch):**

1. Kehrt Alaric an einen Ort zurück, kennt der Erzähler die dort bekannten Menschen **mit ihrem Wissen und ihrer gemeinsamen Geschichte**, ohne dass die Engine ihre Anwesenheit behauptet. **Zeigt** die Antwort eine Person, ist sie danach auch im Zustand anwesend; erwähnt, erwartet oder erinnert genügt nicht.
2. Wer einen Auftrag am Schalter **erzählt bearbeitet**, weiß davon; ein danebenstehender Gast wird nicht zum Bearbeiter. Das gilt auch, wenn Annahme oder Abgabe erst bei Ankunft nach einem GO derselben Nachricht stattfindet.
3. Zwei Schreiber bleiben zwei Menschen. Eine Gruppe ist Szenenfarbe, bis einer von ihnen handelt; dann entsteht genau dieser eine.
4. Ausdrückliche Absprachen gehören zu ihren Parteien, bleiben über Aktualisierung und Erledigung an sie gebunden und werden nur dann „zwischen euch“ gezeigt, wenn Alaric nachweislich Partei ist.
5. Wenige dauerhafte Merkmale (Stimme, Umgang, Interesse) machen wiederkehrende Personen unterscheidbar, **frühestens aus einer späteren Begegnung**, nie aus der ersten Reaktion.

**Ausschlüsse (verbindlich):**

- Keine automatische Anwesenheit aus Arbeitsplatz, `at` oder `KNOWN AT`; Anwesenheit nur über erzählte, prüfbar belegte Antwortstellen.
- Keine zweite autoritative NPC-Datenbank, keine Agenten pro NPC, kein zusätzlicher oder permanenter LLM-Prüfer, kein neuer Modellaufruf, kein Reparaturaufruf.
- Kein Beziehungs- oder Sympathiesystem, keine `attitude`-Kalibrierung (kampfwirksam über `sideOf`), keine Flirtpunkte.
- Keine formalen Privatquests aus Absprachen; keine Engine-Buchung von Versprechen.
- Kein `#npc pin`, keine Salienzskala über E3 hinaus (E4).
- Keine pauschale Budgeterhöhung; Kopf + drei Felder und 170-Zeichen-Kappen der Kompaktkarte bleiben.
- Keine Migration historischer Daten (Sammelpersonen, alte Faktobjekte, Threads ohne Personenbezug bleiben, wie sie sind); keine Wiederherstellung früher abgelehnter Events in bestehenden Saves.
- `witnessEvents` wird nicht gelockert; der bestehende `enter`-Pfad bleibt unverändert (§11, D12).
- Stealth S2, Kampf, Wirtschaft, PULSE D bleiben unberührt; PULSE A/C/B ohne Redesign.
- Die .158- und .168-Abnahmen werden nicht umgedeutet; bestehende Tests und Replayakzeptanzen werden nur ergänzt, nie gelockert.

---

## 2. Bestehende Regeln und neue Regeln

**Bestehende Regeln, die gelten und geschützt werden:** Kanon 02 (NPC-Wissen nur aus eigener Wahrnehmung; Gesprächskontinuität; Flirt ohne automatische Zuneigung). Decision Ownership: Vertragsstatus, Auszahlung, XP, Rang, Geld, Gegenstände, Kampf und Alarics Entscheidungen gehören der Engine (`stripOwned`, `pc_decision`, `trueDeaths`). `witnessEvents` nur für Anwesende, kein rückwirkendes Wissen. Bekannte Personen von anderswo nur mit erzähltem Beleg (`absentKnown` + `presenceInReply`). Erzählbelege über `narratedEvent` (wörtlich, erzählt statt gesprochen, nicht verneint, nicht geplant/hypothetisch, nicht erinnert, kein Hörensagen). Exakter Faktresolver (.158). Kompaktkarte Kopf + drei Felder (.158). Ereignisquelle Record; Swipe, Reload und Replay deterministisch.

**Neue Regeln:**

| ID | Regel | Paket |
|---|---|---|
| R1 | **Wiederbegegnung nur mit Erzählbeleg.** `expected.<seq>.met` ist eine Liste `{who, evidence}`. Die Engine trägt eine Person nur ein, wenn (a) die Ankunft **genau dieses GO-Schritts** in dieser Antwort gebucht wurde und Alaric in diesem Moment am Ziel steht, (b) `who` in der beim Spielerzug für diesen Schritt angebotenen `KNOWN AT`-Liste steht, lebt und nicht anwesend ist, (c) `evidence` eine wörtliche, erzählte, nicht verneinte, nicht geplante, nicht erinnerte Antwortstelle ist (`narratedEvent`) und (d) diese Stelle **genau diese Person** identifiziert (§8 Identifikationsregel). Pronomen allein identifizieren nie. Ein Identitätstreffer genügt nicht: die belegte Stelle muss die Person selbst **gegenwärtig im erreichten Raum** zeigen (Handlung, Sprache oder unmittelbare Anwesenheit), nicht nur ihr Bild, Eigentum, ihren Namen auf einem Schild oder eine frühere Nachricht über sie. Scheitert ein Punkt, bleibt die Person abwesend; nichts wird nachträglich „repariert“. | E2-A |
| R2 | **Bearbeiterzeuge nur für den konkreten Schritt und mit Handlungsbeleg.** `expected.<seq>.handled_by = {who, evidence}` gibt es für `quest.accept`/`quest.turn_in` mit Status `resolved` **und** `conditional`. Ausgewertet wird nur, wenn dieser `seq` beim Spielerzug `resolved` war oder in dieser Antwort `cmd.completed {seq, ok:true}` erhielt; dann nur für die Quest dieses Schritts und ihren Fakt (`f.pc.accepted.<q>` bzw. `f.pc.completed.<q>`). `who` muss nach allen Personendeltas anwesend, lebend und Gildenperson in einer Gildenhalle sein. `evidence` muss eine erzählte Bearbeitungshandlung sein (Verb + Schalterobjekt) und `who` als Handelnden zeigen, per Bezeichnung oder per Pronomen nach der Bezugsregel (§8). Bei `refused`, `clarify`, nicht ausgeführter Bedingung, nicht erreichter Halle oder fremdem Handelnden gibt es kein zusätzliches Wissen. Die .158-Literalprüfung bleibt Rückfall. | E2-A |
| R3 | **Eine Person je `person.new`.** Eine Gruppe („two clerks“, „the guards“) wird nicht gespeichert. Handelt ein Mitglied, meldet der Extractor genau dieses als eigene Person; keine erfundene zweite Biografie. | E2-A |
| R4 | `keptHere` bildet nie auf eine Person ab, die `distinct_from` ausschließt, und nie auf eine historische Sammelperson. | E2-A |
| R5 | **Behauptungen mit Sprecher.** Nur Sprechprädikate einer NPC-Person (`says`, `said`, `remark`, `remarked`, `claims`, `claimed`, `reports`, `reported`, `mentions`, `mentioned`, `tells`, `told`, `rumor`, `rumour`) erscheinen im Abruf als „<Sprecher> said (their claim, not engine state): …“. Gespeichert bleibt die wahre Tatsache, dass die Person es sagte. Andere freie NPC-Fakten bleiben unverändert. | E2-A |
| R6 | **Ankunftskarten** nur bei autorisiertem GO (Status `authorized`) an einen Ort mit `KNOWN AT`, dessen Erreichen in dieser Antwort vorgesehen ist (keine bekannte Etappe/Zwischenstation davor). Sie bleiben NOT YET SHOWN. Wer vor der Abreise direkt angesprochen oder Handlungspartner ist (Interlocutor-Punkte ≥ 400), behält seinen Slot; Ankunftskarten füllen nur die übrigen bis zwei. | E2-B |
| R7 | **Absprachen mit Parteien.** `promise`/`debt`-Threads tragen `who` = ihre Parteien (1–3, `pc` erlaubt). `pc` gilt nur, wenn eine NPC-Partei nach den Anwesenheitsdeltas dieser Antwort anwesend ist (Absprache von Angesicht zu Angesicht). Die Bindung bleibt bei Aktualisierung und Erledigung; Zuordnung neuer Formulierungen beachtet die Parteien. Kein zusätzlicher freier Fakt für dieselbe Absprache. | E2-B |
| R8 | **Kompaktkarte ohne Verdrängung von `knows`.** Eine offene oder erledigte Absprache mit Alaric wird an die Zeile `toward Alaric` angehängt (gemeinsam ≤ 170 Zeichen). Die beiden weiteren Felder sind die ersten vorhandenen von `last meaningful` → `knows` → `also remembers`. | E2-B |
| R9 | **Erinnerung: nur der Engine-Teil fällt.** Ein besessenes Satzglied wird an Koordinationsgrenzen außerhalb von Zitaten geteilt; **jedes** Teilstück durchläuft alle bestehenden Besitz-, `pc_decision`- und Todesprüfungen. Ein sozialer Rest bleibt nur mit direkter Rede oder ≥ 6 Wörtern. | E2-B |
| R10 | **Persönlichkeitsanker erst aus späterer Begegnung.** `voice`, `manner`, `interest` sind Record-Prädikate mit je einem Wert. Angenommen nur, wenn die Person anwesend ist und eine **frühere eigenständige Begegnung** belegt ist: eine gemeinsame Erinnerung mit Alaric aus einem Zug **vor** dem Beginn ihrer aktuellen Anwesenheitsspanne (§7). Ein Name, eine Wichtigkeit oder eine Absprache ersetzt diesen Nachweis nicht. Stimmungswerte ohne Gewohnheitsmarker werden abgelehnt; ein bestehender Anker wird höchstens einmal je späterer Spanne ersetzt. | E3 |

---

## 3. Architekturentscheidung

**Variante A**: bestehende Stores erweitern, strukturierte Extractorfelder in bestehenden Shapes, kompakte Kartenzeilen. Begründung in Analyse §8. Variante B (eigener Beziehungs-/Gedächtnisspeicher) verletzt die Vorgabe gegen eine zweite autoritative Datenbank.

**Konkret:** keine neuen Eventtypen. Neue optionale Felder in bestehenden Strukturen:

| Struktur | Neu |
|---|---|
| Extractor-`expected` | `go.met: [{who, evidence}]`; neues Shape `desk: {handled_by: {who, evidence} \| null}` |
| Outcome des Spielerzugs (`turn.js:101`) | `known_at: {<seq>: [ids]}` (die angebotene Liste je GO-Schritt) und `desk: {<seq>: {quest, kind}}` (Quest und Art je Schalterschritt) |
| `thread.set` | `who: [refs]` |
| Faktprädikate | `manner`, `interest` (neben vorhandenem `voice`) |
| Fold (abgeleitet, kein Event) | `scene.since[id]`: Zug, in dem die aktuelle Anwesenheitsspanne einer Person begann |

Anwesenheit und Wissen aus E2-A entstehen über die vorhandenen Events `scene.entered`, `entity.updated` und `knowledge.gained`.

---

## 4. Module und Funktionen

### E2-A Integrität

| Datei | Änderung |
|---|---|
| `content/deltas.json` | `expected.go.met`: „for each person of KNOWN AT this reply shows at the reached place: who (id) and evidence (the reply's own narrated words that show them there, naming or describing them); not those remembered, expected, said to be away, or only referred to by a pronoun; [] when none“. `expected.desk`: „handled_by: the Guild person this reply shows handling THIS contract step at the desk (takes or stamps the slip, logs it, pays out) with evidence (the narrated words of that act); null when the reply shows no such act“. `person.new.summary`: R3 inklusive „when one member of a group acts, that one is a person.new; the group stays scene colour“. `distinct_from`: auch „a different person in the same role at this place“. |
| `src/v4/extract.js` | `EXPECTED_SHAPES.go` um `met: nullable array of {who: string, evidence: string}`; neues Shape `desk: {handled_by: nullable {who: string, evidence: string}}`. |
| `src/v4/commands.js` | GO: zusätzlich zur `KNOWN AT`-Zeile (L678) `ctx.knownAt[seq] = ids`. `quest.accept` (L1292) und `quest.turn_in` (L1333): bei Rückgabe `resolved` oder `conditional` `ctx.expectedKeys[seq] = 'desk'` und `ctx.desk[seq] = {quest: q.id, kind: 'accept' \| 'turn_in'}`; nicht bei `refused`/`clarify`. |
| `src/v4/turn.js` | Outcome (L101) um `known_at: ctx.knownAt` und `desk: ctx.desk`. Ältere Records ohne diese Felder: `met`/`handled_by` werden dort nie ausgewertet. |
| `src/v4/narration_evidence.js` | **`identifiesPerson(clause, id, candidates, state)`** (§8). **`deskHandlingEvidence(prose, evidence, id, {candidates, pcPronouns:['he','him','his','himself']})`**: `narratedEvent(prose, evidence)` ok; Bearbeitungsverb (bestehende Liste aus `guildParticipationEvidence` plus `logged`, `inked`, `wrote`, `signed`, `handed`) mit Schalterobjekt (`contract`, `slip`, `ledger`, `seal`, `roll`, `payout`, `reward`, `coins`, Münzwort) im selben Satz; Handelnder per `identifiesPerson` **oder** Pronomen nach der Bezugsregel. Bestehende Funktionen unverändert. |
| `src/v4/world.js` | **`metArrivals(k)`** unmittelbar nach der gebuchten Ankunft des GO-Schritts `k` (`applyExpected` L857 ff., `arrive`-Deltas L993/L1016, Ankunftsprüfung L1578 ff.), also vor einer späteren Etappe derselben Nachricht. Prüft R1 gegen `outcome.known_at[k]` und `s.scene.at`; gültige über denselben Folgepfad wie `enter` (Eintritt, `entity.updated(at)`, Abschlussnachtrag L1147). Ungültige → `reject(…, 'met_not_known_here' \| 'met_without_arrival' \| 'met_evidence')`, keine Korrektur, kein Eintritt. **`deskHandler()`** nach allen Personen-/Anwesenheitsdeltas und nach den Bedingungsausführungen (L2475 ff.): für jeden `desk`-Schritt prüft er R2 (Status aus `outcome.resolutions` bzw. `cmd.completed` dieser Antwort; Quest aus `outcome.desk[k]`) und emittiert `knowledge.gained {who, about, stance:'knows', source:'witnessed'}`, falls noch unbekannt. Ungültig → `reject(…, 'desk_handler')`. **`collectivePerson(d)`** in `case 'person.new'` vor allen Zuordnungen → `refusePerson('collective_person', …)`. **`keptHere(d)`** (L1945): Kandidaten ohne `d.distinct_from` und ohne Sammelpersonen. `met`/`desk` laufen als `expected`/`engine`-Schritt, den die Ownership-Prüfung (`kindViolation` prüft nur `delta`-Schritte) nicht abdeckt; ihr Schreibumfang (nur `scene`, `entities.at`, `knowledge`) wird deshalb per Regression festgehalten (A7). |
| `src/v4/domain.js` | `collectivePerson(role, desc)`: Zahlwort/Gruppenquantor am Anfang (`two`, `three`, `several`, `both`, `a pair of`, `a group of`, `a handful of`, `a crowd of`) **oder** Kopfnomen der Rolle ist Plural eines Personennomens (`SERVICE_ROLE`-Plurale sowie `guards`, `soldiers`, `adventurers`, `workers`, `villagers`, `brothers`, `sisters`). Markiert auch Altbestände für R4. |
| `src/context.js` | Abrufitem `kind:'fact'` (L440): Label nach R5, nur für Sprechprädikate. |

### E2-B Kontinuität

| Datei | Änderung |
|---|---|
| `src/context.js` | **`arrivalPeople(state, content, outcome)`**: letzter `authorized` GO-Schritt des Zugs mit `known_at` und ohne bekannte Etappe/Zwischenstation davor; Kandidaten = `outcome.known_at[seq]`; Rang: benannt > offene Absprache mit Alaric > bedeutsame gemeinsame Erinnerung > jüngste Begegnung. **Slotvergabe (R6):** zuerst anwesende Personen mit Interlocutor-Punkten ≥ 400 (in der Eingabe benannt oder Handlungspartner), dann Ankunftspersonen, zusammen höchstens zwei. Abschnitt `npc_arrival` (Prio 0, Kopf „ARRIVING AT <Ort> — people known there; NOT YET SHOWN: present only if the story shows them there“) ersetzt `npc_compact` nur für die freien Slots. `KNOWN AT` im Erzählerblock nur für Personen ohne Karte; der Extractor erhält die volle Liste über `ctx.extra`. **`compactNpcCard` (R8):** Zeile 1 = `toward Alaric: …` + `; between you: <Absprache>`. Die Absprache wird zuerst gekürzt, bleiben < 40 Zeichen, entfällt sie aus der Kompaktkarte (Detailkarte behält sie). Zeilen 2–3 = erste vorhandene von `last meaningful` → `knows` → `also remembers`. Jede Zeile ≤ 170. **`npcCard`:** Zeilen `open between you:` (offene `promise`/`debt` mit `who ⊇ {pc, id}`, höchstens zwei, neueste zuerst) und `settled between you:` (jüngste erledigte, wenn sie jünger ist als die letzte bedeutsame Erinnerung). Abrufitem `kind:'thread'` (L451/452): `entities: (t.who || []).filter(x => x !== 'pc')`. |
| `src/threads.js` | **`threadEvents()`** (L103–122): `who` im gespeicherten Objekt. Neu: aus `th.who`. Update per ID: `cur.who` bleibt, neue Parteien werden vereinigt (≤ 3), nie entfernt. Erledigung: `cur.who` bleibt. **`matchThread(state, text, kind, who)`** (L39): Mit NPC-Parteien im Bericht nur Kandidaten mit gemeinsamer NPC-Partei. Ein Altthread ohne `who` passt dann nur bei **exakt gleichem Text**; nur in diesem sicheren Fall erhält er die Parteien. Ohne Parteien im Bericht: heutiges Verhalten (zwei Kandidaten = kein Treffer). |
| `src/delta.js` | L838–846 reicht den Berichtsthread unverändert an `threadEvents` durch; der Code filtert dort keine Felder. Keine Änderung geplant; die End-to-End-Regression bis zum gespeicherten `thread.set` prüft das (B2). |
| `src/v4/world.js` | `case 'thread'` (L1299): `who` über `mapRef` (auch Refs aus `person.new` dieser Antwort); nur existierende lebende NPCs und `pc`; `pc` nur nach R7. Bleibt keine NPC-Partei, wird der Thread ohne `who` gespeichert (heutiges Verhalten). Übergabe an `v3({threads:[…]})` inklusive `who`. |
| `src/v4/ownership.js` | `stripOwned(text, {store:'memory'})` (L384) nach R9; andere Stores unverändert. |
| `content/deltas.json` | `thread.fields.who` (nullable, 1–3 Refs inklusive `pc`); Summary für `promise`/`debt`: nur ausdrückliche Zusage zwischen genannten Parteien, inklusive ausdrücklich aufgeschobener Einladung mit Bedingung (D6). Nicht: unbeantwortete Bitte, Höflichkeitsfloskel, abgelehntes Angebot, öffentliches Angebot (Board), engine-gebuchter Handel/Auftrag. Regel „PERSON CONTINUITY“: „an agreement is one thread with its parties, never also a fact“. |
| `src/commands.js` | `#npc` (L329): „Open between you:“ nur aus Threads mit `who ⊇ {pc, id}` (D1). NPC→NPC-Absprachen erscheinen dort nicht. |

### E3 Persönlichkeitsanker

| Datei | Änderung |
|---|---|
| `src/state.js` | Abgeleitet im Fold, kein neues Event: `scene.entered` (L160) setzt `scene.since[id] = state.turn`, wenn `id` vorher nicht anwesend war. `scene.left` (L165) und `scene.moved` mit `reset_present` (L148) entfernen die Einträge. Alte Saves erhalten die Werte beim Falten aus ihren Events. |
| `src/v4/ownership.js` | Snapshot-Region `scene` (L175) um `scene.since`. |
| `src/knowledge.js` | `FUNCTIONAL` um `manner`, `interest`; `PRED_SYNONYMS`: `temperament`, `demeanor`, `demeanour`, `personality`, `disposition` → `manner`; `interests`, `hobby`, `cares_about`, `passion` → `interest`. |
| `src/context.js` | `RECORD_PREDICATES` um `manner`, `interest`; `npcCues` liefert sie. Kopfzeile: `• <Handle> — person, <Rolle>; voice: …; manner: …; interest: …; <look>`. Der 170-Zeichen-Schnitt trifft zuerst den Einführungstext. |
| `src/v4/world.js` | `case 'fact'` mit NPC-Subjekt und `p ∈ {voice, manner, interest}`: **`anchorAllowed(id, value)`** nach R10. (1) Person anwesend nach den Anwesenheitsdeltas. (2) Frühere Begegnung: Erinnerung `m` mit `id ∈ m.who ∪ m.witnesses`, `pc ∈ m.who ∪ m.witnesses` und `m.turn < scene.since[id]`; die einmalige `meeting`-Erinnerung (`engine.js:846`) genügt. (3) `value` ≤ 80 Zeichen, nennt nicht Alaric/`pc`, ohne Besitzteil (`stripOwned(store:'note')`). (4) Stimmungsprüfung: Situationsmarker (`now`, `right now`, `for now`, `today`, `tonight`, `this morning/evening/night`, `at the moment`, `currently`, `just then`, `after the fight`, `since the attack`) oder ein reines Zustandswort (`angry`, `furious`, `upset`, `scared`, `afraid`, `tired`, `exhausted`, `drunk`, `grieving`, `crying`, `wounded`, `relieved`, `nervous`) ohne Gewohnheitsmarker (`always`, `usually`, `habitually`, `tends to`, `never`, `every time`, `as ever`) → `anchor_mood`. (5) Höchstens ein Wert je Prädikat und Antwort; einen bestehenden Anker ersetzt nur ein Wert aus einer **späteren** Spanne als der, in der er gesetzt wurde. Sonst `reject(…, 'anchor_first_contact' \| 'anchor_mood' \| 'anchor_scope')`, ohne Korrektur. Name, Wichtigkeit und Absprache dienen nur der Priorisierung der Anzeige, nicht der Freigabe. |
| `content/deltas.json` | `fact`-Summary: „voice/manner/interest of a person: only a lasting trait this reply SHOWS in their own words or conduct, which you would expect again next week; never this moment's mood, never Alaric's view of them, never invented backstory; a new value only when the reply shows a different lasting trait“. |

---

## 5. Daten- und Eventflüsse

**Rückkehr (E2-A + E2-B):**
Spieler „ich gehe zur Gildenhalle“ → Planner `go` → `commands.go`: Autorisierung, `KNOWN AT` in `ctx.extra`, `ctx.knownAt[seq]`, `expectedKeys[seq]='go'` → Outcome `known_at` → Kontext: `npc_arrival` für freie Slots (Wissen, Erinnerung, Absprache), NOT YET SHOWN → Narration → Extractor `expected.go = {arrived:true, at, with, met:[{who, evidence}]}` → World: Ankunft des Schritts → `metArrivals(seq)` (Beleg + Identifikation) → `scene.entered`, ggf. `entity.updated(at)`, ggf. Abschlussnachtrag → Fold → nächster Zug: Gesprächspartner sind die belegt gezeigten Personen. Kein Beleg → Person bleibt abwesend.

**Schalter direkt (E2-A):**
`quest.accept`/`quest.turn_in` in der Halle → Engine bucht Status und Fakt; `witnessEvents` für Anwesende (unverändert) → Outcome `resolutions[seq].status='resolved'`, `desk[seq]` → Narration → Extractor `person.new`/`enter` + `expected.desk.handled_by = {who, evidence}` → World nach allen Personendeltas: `deskHandler` → `knowledge.gained(witnessed)` nur für den belegten Bearbeiter.

**Schalter nach GO derselben Nachricht (E2-A, User04 I64):**
`go` + `quest.turn_in`/`quest.accept` außerhalb der Halle → `status:'conditional'`, `condition:'arrive_guild_hall'`, Eintrag in `ctx.conditionals` und `desk[seq]` → Narration → Extractor `expected.go` (Ankunft) + `expected.desk` → World: Ankunft → Bedingungsausführung (L2475 ff.) mit `cmd.completed {seq, ok}` → Personendeltas → `deskHandler`: nur bei `ok:true` dieses `seq`. Ankunft nicht erreicht, Vertrag nicht bereit oder Annahme abgelehnt → kein Bearbeiterwissen.

**Absprache (E2-B):**
Narration zeigt Zusage → Extractor `thread {id:null, kind:'promise', status:'open', text, who:['pc', id]}` → World: Refs, R7-Prüfung → `delta.js` → `threadEvents` (Parteien, partnerbewusste Zuordnung) → `thread.set` mit `who` → Fold → Karte „between you“. Später `thread {id, status:'resolved', resolution}` ohne `who` → `threadEvents` übernimmt `cur.who` → Karte „settled“, solange keine jüngere bedeutsame Erinnerung existiert.

**Anker (E3):**
Begegnung 1 → `meeting`-Erinnerung (Zug T₀), `scene.since[id] = T₀`. Abschied/Ortswechsel → Eintrag entfällt. Begegnung 2 → `scene.since[id] = T₁ > T₀`. Extractor `fact {s:id, p:'manner', o}` → World `anchorAllowed` (T₀ < T₁, Stimmungsprüfung) → `fact.asserted` → Kartenkopf.

---

## 6. Felder und Autorität

| Feld | Speicher | Schreibt | Autorität / Prüfung | Sichtbar |
|---|---|---|---|---|
| `expected.go.met[]` `{who, evidence}` | nur Antwort, wird zu `scene.entered` | Extractor | Engine: R1 (Schritt, `known_at`, Beleg, Identifikation) | Erzähler (Folgezug), E0 |
| `expected.desk.handled_by` `{who, evidence}` | nur Antwort, wird zu `knowledge.gained` | Extractor | Engine: R2 (Schrittstatus, Quest, Gildenperson, Handlungsbeleg) | Karte des Bearbeiters |
| `outcome.known_at`, `outcome.desk` | Spielerrecord | Engine | Engine | nur Prüfung |
| `thread.who` | `threads[id].who` | Extractor | Engine: R7 | Erzählerkarte, `#npc` (nur mit `pc`), Abruf |
| `scene.since` | Fold, abgeleitet | Reducer | deterministisch aus Events | nur Prüfung |
| `fact manner/interest/voice` | `facts` (funktional) | Extractor | Engine: R10 | Kartenkopf |
| Ankunftskarte | nur Kontext | Engine | nicht autoritativ, keine Anwesenheit | Erzähler, E0 |
| Sprecherlabel | nur Kontext | Engine | Darstellung | Erzähler (Abruf) |

Kein Feld ist Spielerentscheidung; keines bucht Geld, Gegenstände, Zeit, Kampf oder Status.

---

## 7. Auswahl, Speicherung, Aktualisierung, Abruf

- **Ankunftskarten:** nur nach R6; Kandidaten exakt `outcome.known_at[seq]`; Rang wie §4; Gleichstand nach `id`. Mehrteilige Nachricht: letzter `authorized` GO-Schritt mit `known_at`. Abgelehnte GO oder bekannte Zwischenstation → keine Ankunftskarten (heutiges Verhalten).
- **Gesprächspartner danach:** unverändert `interlocutors` über `scene.present`; per `met` Eingetretene sind normale Anwesende.
- **Kompaktkarte (R8):** Zeile 1 Haltung/Identität + Absprache, Zeilen 2–3 die ersten vorhandenen aus `last meaningful` → `knows` → `also remembers`. Damit bleiben bei einer Person mit Haltung + Absprache + bedeutsamer Erinnerung + Wissen alle vier Angaben sichtbar; nur `also remembers` entfällt. In Zügen mit langer Haltungszeile (Kampf/Wahrnehmung) entfällt die Absprache aus der Kompaktkarte, nicht `knows`.
- **Absprachen speichern:** ein Thread je Absprache und Parteienmenge; Update und Erledigung per ID. Ähnliche Versprechen verschiedener NPCs bleiben getrennt (partnerbewusstes `matchThread`).
- **Erledigte Absprachen:** `settled between you`, bis eine jüngere bedeutsame Erinnerung mit der Person existiert (D4); danach nur Abruf (`Resolved thread …`, bestehend).
- **Anwesenheitsspanne (E3):** beginnt mit dem Eintritt einer bisher nicht anwesenden Person und endet mit `scene.left` oder einem Ortswechsel mit Anwesenheitsreset. Reisebegleiter beginnen am Zielort eine neue Spanne; das gilt bewusst als spätere Szene.
- **Anker:** funktional, jüngster gültiger Wert gilt, alter Wert bleibt als Fakt-Historie (`until`); Ersatz höchstens einmal je späterer Spanne.
- **Abruf:** Threads mit `who` erhalten NPC-`entities`; keine Gewichtsänderung.

---

## 8. Wissens-, Anwesenheits- und Identitätsschutz

**Identifikationsregel `identifiesPerson(clause, id, candidates)`**, gemeinsam für `met` und `handled_by`. `candidates` = angebotene `known_at`-Personen plus Anwesende. Eine Person gilt als identifiziert, wenn die Stelle

1. ihren Namen, `known_name` oder ein eindeutiges Namenswort enthält (wie `personLabels`), **oder**
2. ihre Rolle im Singular mit bestimmtem Artikel nennt („the clerk“) und genau ein Kandidat diese Rolle hat, **oder**
3. ihre Rolle im Plural mit Mengenwort nennt („both clerks“, „the two clerks“) und die Zahl der Kandidaten dieser Rolle genau stimmt; eine historische Sammelperson dieser Rolle zählt dabei als die gesamte Gruppe, **oder**
4. mindestens zwei unterscheidende Inhaltswörter ihrer `descriptors`/`traits`/`appearance`/`armed` enthält (ohne Rollen- und Füllwörter) und strikt mehr als jeder andere Kandidat.

Nicht identifizierend: Pronomen allein, unbestimmte Nennung („a clerk“), Mehrdeutigkeit. Bei Mehrdeutigkeit wird nicht geraten.

**Zusätzliche Präsenzprüfung nur für R1 (`met`):** `narratedEvent` prüft, ob ein Textfragment tatsächlich erzählt statt gesprochen, verneint, geplant oder erinnert wird; `identifiesPerson` prüft, **wen** es nennt. **Beides zusammen beweist noch nicht, dass die Person dort anwesend ist.** Die Stelle muss zusätzlich die Person selbst aktuell vor Ort handeln, sprechen oder sichtbar anwesend sein lassen. Aussagen über ihr Porträt, eine Anschrift, zurückgelassene Gegenstände, frühere Tätigkeiten, eine leere Arbeitsstelle oder den als abwesend genannten Menschen zählen nicht. Bei fehlendem aktuellem Anwesenheitsbeleg `met_evidence`; keine automatische Rückkehr. Beispiel: „A painted sign depicted the clerk at work“ ist Erzählung und benennt den Clerk, zeigt ihn aber **nicht** in der Szene. „The clerk stood behind the counter and waved“ ist ein zulässiger Präsenzbeleg. Beim positiven Nachweis weiterhin die Schritte-/`known_at`-/Mehrdeutigkeitsprüfungen aus R1 beachten.

**Pronomen-Bezugsregel (nur `handled_by`):** Ein Pronomen als Handelnder zählt, wenn (a) es nicht Alarics Pronomen ist (`he/him/his/himself`, wie in `forcedRelocation` bereits angenommen), (b) die nächste vorangehende **nominale** Personennennung im erzählten Text (Name, Rolle oder Beschreibung einer anwesenden Person oder Alarics Name; Pronomen werden übersprungen, wörtliche Rede ist wie in `narrationOnly` entfernt) `who` nach der Identifikationsregel identifiziert und (c) sie höchstens acht erzählte Sätze zurückliegt. Die Satzfolge der Originalprosa User04 I64 habe ich gelesen; die Regel selbst wurde nicht ausgeführt. Auf „the nearer clerk — a grey-haired woman …“ folgen „she said, and took the slip“ (ein Satz später) und „She counted the coins out onto the counter …“ (fünf Sätze später), ohne andere nominale Personennennung dazwischen. Beide würden also erkannt. Bei I74 wird „He stamped the slip“ abgelehnt (Alarics Pronomen); „The older clerk took it … over the top of the slip“ trägt den Beleg mit Bezeichnung.

| Schutz | Umsetzung | Gegenfall |
|---|---|---|
| Keine erfundene Anwesenheit | `met` nur nach gebuchter Ankunft genau dieses Schritts, nur IDs aus `known_at[seq]`, nur mit belegter, identifizierender Erzählstelle | leerer Schalter, Erinnerung, Erwartung, unterbrochene Reise, fremde Stadt, neuer Name → kein Eintritt |
| Bestehender `enter`-Pfad | unverändert (am Ort Gelassene ohne Beleg, Status quo seit .107); E2-A öffnet keinen weiteren unbelegten Pfad | Messpunkt im natürlichen Test, D12 |
| Kein rückwirkendes Wissen | per `met` Eingetretene erhalten nur selbst Bezeugtes (Abschlussnachtrag mit Szenenepoche) | später eintretender NPC ohne Bearbeitung → kein Wissen (.158-Test L132 bleibt) |
| Bystander bleibt Bystander | `handled_by` verlangt Gildenfunktion **und** Handlungsbeleg; `witnessEvents` unverändert (D9) | wiry woman als `handled_by` → abgelehnt |
| Nur der konkrete Schritt | `outcome.desk[seq]` + `resolved`/`cmd.completed ok` dieses `seq` | `refused`, `clarify`, nicht erreichte Halle, nicht bereiter Vertrag → nichts |
| Identität | keine neuen Sammelpersonen; Mitglied wird einzeln aufgenommen, wenn es handelt; `keptHere` respektiert `distinct_from`, nie Sammelperson | „a clerk“, „Tam Ostler“, Rolle „boss“/„mistress“ → normal |
| Absprachen-Parteien | `pc` nur bei anwesender NPC-Partei; „between you“ nur bei `who ⊇ {pc, id}` | NPC→NPC-Versprechen nicht im Panel |
| Erzählerkarte ≠ Spielerpanel | `#npc` zeigt nur Absprachen mit Alaric als Partei | Geheimnisse/Agenda bleiben im Panel unsichtbar |
| Haltung unverändert | kein `attitude`, kein `relations`-Schreiben | `sideOf` unverändert |

---

## 9. Budget und Kosten

**Messbasis (Analyse §8):** Kompaktkarte ≈ 80–100 Tokens je Person; `budgetedTokens` der Rekonstruktionen 1278–2047 bei Budget 1400.

| Paket | Erzählerkontext | Extractorprompt (vorläufige Schätzung) | Modellaufrufe |
|---|---|---|---|
| E2-A | 0 (nur Sprecherlabel im optionalen Abruf) | ≈ +150–200 Tokens Regel-/Shapetext; Shapes nur in Zügen mit GO/Schalter; Antworttokens für `evidence` je gemeldeter Person | 0 zusätzlich |
| E2-B | GO-Züge: Ankunftskarten nur in freien Slots, `KNOWN AT` im Erzählerblock nur für Personen ohne Karte; Ziel ≤ +40 Tokens je GO-Zug. Absprache in Zeile 1: ≤ +25 Tokens je betroffener Karte, innerhalb der 170-Zeichen-Kappe | ≈ +60 | 0 |
| E3 | Anker innerhalb des 170-Zeichen-Kopfs (± 10) | ≈ +60 | 0 |

**Messverfahren (Pflicht vor jedem Build):** `recherche/npc_e2_e3_probes/probe_context.mjs` vor und nach der Änderung auf User01 I61/I62/I69, User02 I62/I63/I73, User04 I71/I72/I73, dazu der Vierfachfall B3. **Abnahmegrenze:** kein neuer Prio-0-Abschnitt außer dem ersetzenden `npc_arrival`; GO-Züge ≤ +40 Tokens; Nicht-GO-Züge ≤ +15 Tokens. Bei Überschreitung zuerst Kartenzeilen kürzen, nie das Budget erhöhen. Den Zuwachs des Extractorprompts tatsächlich messen (Requestmessweg der PULSE-Pakete); die Schätzungen oben ersetzen diese Messung nicht.

---

## 10. Pakete

| Paket | Inhalt | Umfang | Voraussetzung | Eigenständig abnehmbar |
|---|---|---|---|---|
| **E2-A Integrität** | R1 `met` mit Beleg, R2 `handled_by` für direkte und bedingte Schritte, R3 Sammelpersonen, R4 `keptHere`, R5 Sprecherlabel | **M–L**: 8 Dateien (`deltas.json`, `extract.js`, `commands.js`, `turn.js`, `narration_evidence.js`, `world.js`, `domain.js`, `context.js`); Kern sind die Quer-Schnittstellen Ankunft ↔ Bedingung ↔ Personendeltas; ≈ 25 Regressionen | .158/.168 | ja |
| **E2-B Kontinuität** | R6 Ankunftskarten, R7 Parteien inklusive `threads.js`, R8 Kartenzeilen, R9 Erinnerungsrest, `#npc` (D1) | **M**: 7 Dateien (`context.js`, `threads.js`, `world.js`, `ownership.js`, `deltas.json`, `commands.js`, Prüfung `delta.js`); ≈ 18 Regressionen | E2-A | ja |
| **E3 Persönlichkeitsanker** | R10, Anwesenheitsspanne, Kopfzeile | **S–M**: 6 Dateien (`state.js`, `ownership.js`, `knowledge.js`, `context.js`, `world.js`, `deltas.json`); ≈ 10 Regressionen | E2-A | ja |

**Reihenfolge: E2-A → E2-B → E3.** E2-A zuerst, weil Ankunftskarten und Absprachen auf falscher Identität, fehlender Anwesenheit oder falschem Zeugen den Fehler vergrößern würden (Analyse §4.3). Jedes Paket hat eigenen Build, eigene Patchnote und eigene Abnahme und endet mit Stopp.

---

## 11. Abhängigkeiten, Risiken, Integrationsprüfungen

| Risiko | Wirkung | Gegenmaßnahme |
|---|---|---|
| Extractor meldet `met`/`handled_by` falsch-positiv **[H]** | Person anwesend bzw. wissend ohne Erzählung | Engine nimmt nur belegte, identifizierende Erzählstellen; Mehrdeutigkeit → nichts; Gegenfälle A1a–A1f, A2a–A2c |
| Extractor lässt `met`/`handled_by`/`evidence` leer **[H]** | Verbesserung bleibt aus | Rückfall auf heutiges Verhalten; natürlicher Test misst die Quote |
| Bestehender `enter`-Pfad bleibt permissiv | unbelegter Eintritt am Ort Gelassener wie bisher | bewusst unverändert, um keine bestehende Anwesenheit zu verlieren; natürlicher Test zählt Fehleintritte; Verschärfung nur nach D12 |
| Bezugsregel greift falsch | Wissen beim falschen Schreiber | nur nominaler Vorgänger, Alarics Pronomen ausgeschlossen, fünf-Satz-Grenze, Mehrdeutigkeit → nichts (A2b/A2c) |
| Bedingte Schritte ohne Ausführung | Wissen ohne Abgabe | Bindung an `cmd.completed ok` des `seq` (A3a–A3d) |
| Sammelpersonenregel trifft Einzelne / verhindert Personen | Person fehlt | enge Wortliste; Mitglied wird beim Handeln einzeln aufgenommen (A4) |
| Ankunftskarten verdrängen laufenden Dialog | Kontinuitätsverlust vor Abreise | Slotvorrang für angesprochene Anwesende (B1a), Messgrenze §9 |
| Thread-Bindung geht verloren oder verschmilzt | falsche „between you“-Zeilen | `who` in `threadEvents`, partnerbewusstes `matchThread`, End-to-End bis `thread.set` (B2–B2e) |
| Absprachen-Inflation | Karten voller Floskeln | enge Summary; natürlicher Test |
| `stripOwned`-Teilung lässt Besitz durch | zweite Wahrheit in Erinnerung | jede Teilung durchläuft alle Prüfungen; bestehende Ownershiptests unverändert grün (B4–B4d) |
| Abgeleitetes `scene.since` | Fold-/Snapshot-Abweichung | nur Reducer, Snapshot-Region `scene` ergänzt, Reload/Swipe-Regression (C5) |
| Anker aus Stimmung | starre Figur | Stimmungsprüfung, Ersatz nur je späterer Spanne (C3/C4) |

**Integrationsprüfungen je Paket:** vollständige `npm test`-Suite. Replay gegen die `.126`-Baseline (2235 Fälle) mit kategorisierter neuer Akzeptanzliste je Paket; alte Listen bleiben unverändert. Erwartete Verschiebungen: E2-A lehnt Sammelpersonen in historischen Antworten ab, Folgereferenzen verschieben sich; historische Records ohne `known_at`/`desk` bleiben für `met`/`handled_by` unberührt; E2-B R9 kann beim Replay früher abgelehnte Erinnerungsreste behalten. Das betrifft nur die Neuanwendung im Replaywerkzeug; bestehende Saves falten ihre gespeicherten Events unverändert. PULSE-Akzeptanzen `accepted_pulse164/167` unverändert; `heldThreats` liest nur Bedrohungen. ST-Smokes: Start, GO mit `KNOWN AT`, Schalter direkt und nach GO, Swipe/Regenerate mit E0-Aktualisierung, Save/Reload. Fold alter Saves: Threads ohne `who`, keine Anker, `scene.since` aus Events. Stealth-S1-Beobachter: per `met` Eingetretene zählen als Anwesende, Ankunftskarten nicht.

---

## 12. Testmatrix (Rot/Grün) und Host-Abnahme

**Rot** = auf .168 als fehlschlagend erwartet: belegt durch eine Probe der Analyse (A4, A5, B1, B3-Vorstufe, B4) oder weil das geprüfte Feld/Verhalten auf .168 nicht existiert. Der Fehlschlag ist vor der Umsetzung als Test tatsächlich nachzuweisen. Grundlage sind Originalzustände und Originalprosa der Fixtures/Läufe mit synthetischen Extractorantworten, wie in `fix158_continuity.test.js` und `probe_keep.mjs`. **Gegenfälle** müssen auf .168 und nach der Umsetzung gleich ausgehen (kein Eintritt, kein Wissen), sofern nicht anders angegeben.

### E2-A

| ID | Ausgangszustand | Handlung | Erwartete autoritative Events | Erwartete Kontextauslieferung | Gegenfälle |
|---|---|---|---|---|---|
| A1 **rot** | User04 nach I71 (GO zur Halle) | Prosa I72; `met:[{who:crossbowman, evidence:"the stocky man with the crossbow sat over fresh maps again"}]` | `scene.entered(npc.npcbench_crossbowman)` (Identifikation über `stocky`/`crossbow`/`maps`) | I73: Crossbowman als Gesprächspartnerkandidat | siehe A1a–A1f |
| A1a | wie A1 | Antwort zeigt nur leeren Schalter („The counter stood empty“); `met:[{who:clerks, evidence:"The counter stood empty"}]` | `delta.rejected(met_evidence)`, kein Eintritt | — | ohne `evidence` → ebenso |
| A1b | wie A1 | „He hoped the grey-haired clerk would be there“ / „He remembered the clerk's ledger“ | abgelehnt (`narratedEvent`: geplant bzw. erinnert) | — | — |
| A1c | wie A1 | „both clerks at work this time“ für die historische Sammelperson | Eintritt `npc.npcguild_clerks` | — | Fixture mit zwei einzelnen Schreibern → beide; drei Schreiber + „both clerks“ → keiner |
| A1d | GO mit Ankunft `arrived:false` bzw. Zwischenstopp vor dem Ziel | `met` mit gültigem Beleg | `met_without_arrival`, kein Eintritt | keine Ankunftskarte für B1-Folgezug | — |
| A1e | wie A1 | `met` für `npc.harl_vess` (`at=null`), für den Innkeeper des Ausgangsorts, für einen bekannten Gast einer anderen Stadt, für einen frei erfundenen Namen | `met_not_known_here`, kein Eintritt, keine neue Person | — | — |
| A1f | wie A1 | `who:clerks`, `evidence` beschreibt den Crossbowman | `met_evidence` | — | — |
| A1g | zwei GO-Schritte in einer Nachricht (Halle, dann Wirtshaus) | `met` zu Schritt 1 und 2 | Schritt-1-Personen treten in der Halle ein (dann Reset), Schritt-2-Personen nur gegen `known_at[2]` | — | `met` zu Schritt 1 mit ID aus `known_at[2]` → abgelehnt |
| A1h | GO in die Halle, Clerk aus `known_at`; Antwort: „A painted sign depicted the clerk at work, but the counter stood empty.“ | `met:{who:clerk, evidence:"A painted sign depicted the clerk at work"}` | `delta.rejected(met_evidence)`, kein Eintritt: Erzähl- und Identitätsbeleg sind **kein** Präsenzbeleg | — | „The clerk stood behind the counter and waved“ bei demselben eindeutigen Clerk → Eintritt; zurückgelassenes Ledger/Notiz ebenso kein Eintritt |
| A2 **rot** | User04 nach I73 (direkte Annahme, `resolved`) | Prosa I74; `person.new` älterer Schreiber; `handled_by:{who:ref, evidence:"The older clerk took it, read the client line, then looked up at Alaric over the top of the slip"}` | Eintritt + `knowledge.gained(<neu>, f.pc.accepted.quest.slay_the_marsh_titan_of_hollowmere, witnessed)` | Bearbeiterkarte `knows: … accepted …` | A2a–A2c |
| A2a | wie A2 | `handled_by:{who:wiry woman, evidence:"The wiry woman had stopped by the door with her rolled maps, watching"}` | `desk_handler`, kein zusätzliches Wissen; ihr Bystanderwissen aus `witnessEvents` bleibt (D9) | — | — |
| A2b | zwei einzelne Schreiber derselben Rolle anwesend | „The clerk stamped the slip“ | `desk_handler` (mehrdeutig) | — | „The older clerk stamped the slip“ → nur der ältere; die Schreiberin nicht |
| A2c | wie A2 | Beleg nur „He stamped the slip, blotted it and held it out“ | `desk_handler` (Alarics Pronomen) | — | — |
| A3 **rot** | User04 vor I64 (GO + bedingte Abgabe) | Originalprosa I64, `enter` Schreiber wie im Original; `handled_by:{who:npc.npcguild_clerks, evidence:"she said, and took the slip"}` bzw. `"She counted the coins out onto the counter from a locked drawer"` | `cmd.completed(ok)`, `knowledge.gained(npc.npcguild_clerks, f.pc.completed.…catacombs…, witnessed)` per Bezugsregel | I66: Karte mit Abschlusswissen | A3a–A3e |
| A3a | wie A3 | Antwort erreicht die Halle nicht (`arrived:false`) | kein `cmd.completed`, kein Wissen trotz `handled_by` | — | — |
| A3b | wie A3, Vertrag nicht bereit | Ankunft gebucht | Bedingung nicht ausgeführt, kein Bearbeiterwissen | — | — |
| A3c | GO + bedingte `quest.accept` | Ankunft + `handled_by` mit Beleg | `knowledge.gained(…, f.pc.accepted.<q>)` | — | Annahme bei Ankunft abgelehnt (nicht mehr gelistet) → nichts |
| A3d | Schritt `refused`/`clarify` | `handled_by` mitgeliefert | kein `desk`-Schritt, Feld ignoriert | — | — |
| A3e | wie A3 | ohne `handled_by` | heutiges .158-Verhalten (Literalprüfung false) | — | Kontrollsatz „The clerk counted out ninety copper …“ → .158-Rückfall true |
| A4 **rot** | User04 vor I6 bzw. I64 | `person.new` „Two clerks working the long counter …“ **und** `person.new` „the nearer clerk — a grey-haired woman …“ | Gruppe `collective_person`, Schreiberin als Entität | — | Referenz auf die abgelehnte Gruppen-Ref → unbekannte Ref, kein Wissen; „a clerk“, „Tam Ostler“, Rolle „boss“ → normal; benannte Gruppe „the Brannock brothers“ → abgelehnt |
| A5 **rot** | User04 nach I71 (`probe_keep` a) | `person.new` unbenannter Schreiber „older man …“ | neue Entität statt `scene.entered(npc.npcguild_clerks)` | — | Einzelperson als einziger Kandidat ohne `distinct_from` → Abbildung bleibt; mit `distinct_from` → neue Entität |
| A6 | User04 Endzustand | Abruf mit „catacombs posting“ | — | `remark`-Zeile: „… said (their claim, not engine state): …“ | `advice`/`greeting`/`occupation` unverändert |
| A7 | A1, A2, A3 | Eventtypen der `met`/`desk`-Schritte | nur `scene.entered`, `entity.updated(at)`, `knowledge.gained` | — | — |

### E2-B

| ID | Ausgangszustand | Handlung | Erwartete autoritative Events | Erwartete Kontextauslieferung | Gegenfälle |
|---|---|---|---|---|---|
| B1 **rot** | User01 nach I61 (GO zur Halle: `outcome.resolutions` mit **`status:'authorized'`**, nicht `resolved`) | Kontextaufbau | — | `npc_arrival` mit Brenna (+ Doran), NOT YET SHOWN; keine Kompaktkarte Marda; E0 `npcIds` mit Brenna; Extractor-Actions mit voller `KNOWN AT` | GO an neuen Ort ohne `KNOWN AT` → heutiges Verhalten; abgelehnte GO → keine Karte; Budgetgrenze §9 |
| B1a | wie B1, Eingabe „I thank Marda and go to the hall“ | Kontextaufbau | — | Marda behält einen Slot (benannt), eine Ankunftskarte | — |
| B1b | GO mit bekannter Etappe/Zwischenstation | Kontextaufbau | — | keine Ankunftskarte | — |
| B2 **rot** | User02 vor I54 | `thread {kind:'promise', who:['pc', Tam]}`; I58 Erledigung per `id` ohne `who` | `thread.set` mit `who:['pc','npc.npcguild_clerk']`; nach I58 `who` gleich, `status:'resolved'` | I55: Zeile 1 „…; between you: …“; I72/I73: „…; between you: settled …“ | — |
| B2a | zwei NPCs versprechen unabhängig dasselbe („buy him a drink“) | zwei Threads mit `who:[pc,Tam]` bzw. `[pc,Bess]`, später Erledigung des zweiten per Wortlaut mit `who:[pc,Bess]` | zwei IDs; nur Bess' Thread `resolved` | — | gleiche Berichte ohne `who` → heutige Zwei-Kandidaten-Regel (kein Treffer) |
| B2b | nach B2 | Swipe/Regenerate, Reload, Neufold | `who` unverändert | — | — |
| B2c | Marda verspricht Tam etwas | `who:['npc.marda','npc.npcguild_clerk']` | gespeichert ohne `pc` | keine „between you“-Zeile; `#npc` ohne „Open between you“ | — |
| B2d | Tam nicht anwesend | `who:['pc', Tam]` | `pc` entfällt | keine „between you“-Zeile | — |
| B2e | Altthread ohne `who` | Bericht mit exakt gleichem Text + `who` | Altthread erhält Parteien | — | nur überlappender Text + `who` → neuer Thread, Altthread unverändert; Altsave lädt unverändert |
| B3 **rot** | User01 I69 + offene Absprache mit Brenna (synthetisch) | Kontextaufbau | — | Kompaktkarte: Zeile 1 Haltung + „between you“, Zeile 2 `last meaningful`, Zeile 3 `knows`; jede ≤ 170 | ohne Absprache: `toward`, `last meaningful`, `knows`; lange Haltungszeile (Kampf/Wahrnehmung) → Absprache nur in Detailkarte, `knows` bleibt |
| B4 **rot** | User02 I14 | Erinnerung „Tam Ostler stamped the Glimmerdeep contract active and wished Alaric luck: '…settle that drink.'“ | `memory.recorded` „Tam Ostler wished Alaric luck: '…'“ | — | B4a–B4d |
| B4a | — | „Tam paid him sixty copper and nodded“ | abgelehnt (Rest zu kurz) | — | — |
| B4b | — | „Tam said 'your contract is active now, and the pay is yours'“ | Zitat nicht geteilt; Besitzmuster → abgelehnt | — | — |
| B4c | — | „Brenna registered him as Novice and he bought a sword and thanked her warmly for the advice“ | nur „Brenna … thanked …“-Rest nach Prüfung; Kauf (`pc_decision`) und Rang entfallen | — | Doppel-`and` und Pronomensubjekt bleiben unaufgelöst, kein erfundener Bezug |
| B4d | — | Rest mit Siegbehauptung („… and killed the titan …“) | `trueDeaths`/Besitz verwirft den Teil | — | — |
| B5 | User02 nach B2 | `#npc Tam` | — | Panel „Open between you: …“ bzw. nach Erledigung keine offene Zeile; keine Geheimnisse | NPC→NPC-Thread (B2c) nicht im Panel |

### E3

| ID | Ausgangszustand | Handlung | Erwartete autoritative Events | Erwartete Kontextauslieferung | Gegenfälle |
|---|---|---|---|---|---|
| C1 **rot** | erste Begegnung, Person beim Erstkontakt **benannt** (Tam-artig) | synthetisch `fact {p:'manner', o:'dry and teasing with newcomers'}` in derselben Spanne | `anchor_first_contact` | Kopf ohne Anker | unbenannter Erstkontakt → ebenso |
| C2 **rot** | User01 Brenna nach Rückkehr (frühere `meeting`-Erinnerung, neue Spanne) | `fact {p:'manner', o:'dry, unhurried, keeps strangers at a ledger's length'}` | `fact.asserted` | Kopf `…; manner: …; <look gekürzt>` ≤ 170 | abwesend → abgelehnt; `o` nennt Alaric → abgelehnt; > 80 Zeichen → abgelehnt |
| C3 | wie C2 | `o:'furious tonight'` / `o:'angry'` | `anchor_mood` | — | `o:'always short with drunks'` → angenommen (Gewohnheitsmarker) |
| C4 | Anker gesetzt in Spanne 2 | zweiter Wert in Spanne 2 / anderer Wert in Spanne 3 | Spanne 2: `anchor_scope`; Spanne 3: neuer Fakt, alter `until` | Kopf zeigt neuen Wert | `temperament` → `manner` normalisiert |
| C5 | beliebiger Altsave | Reload, Swipe, Neufold | `scene.since` identisch; Reisebegleiter beginnen am Ziel neue Spanne | — | — |
| C6 | Suite | — | keine `attitude`/`relations`-Events durch E3; `sideOf` unverändert | — | — |

**Host-Abnahme je Paket (natürlicher Lauf, vom Nutzer gespielt):**

1. Mit einer Schreiberin sprechen, den Ort verlassen, schlafen, zurückkehren: Sie wird erkannt und ist nach einer Antwort, die sie zeigt, anwesend (E2-A); ihre Karte erscheint schon in der Ankunftsantwort (E2-B). Eine Antwort ohne sie trägt sie nicht ein.
2. Annahme und Abgabe mit frei formulierter Bearbeitung, auch „ich gehe zur Halle und gebe ab“ in einer Nachricht: Der Bearbeiter weiß davon, Umstehende werden nicht Bearbeiter.
3. Zwei Schreiber werden unterscheidbar geführt.
4. Eine Absprache treffen und später einlösen: Karte zeigt offen, danach erledigt; ähnliche Absprachen mit verschiedenen Personen bleiben getrennt; keine Floskeln als Absprachen.
5. Wiederkehrende Person: Anker frühestens in der zweiten Begegnung, keine Stimmung als Dauermerkmal (E3).
6. E0 zeigt keine neue Überlaufquelle; Swipe/Reload ohne Abweichung; Fehleintritte über den bestehenden `enter`-Pfad werden gezählt (D12).

---

## 13. Offene Designentscheidungen

Die als **entschieden** gekennzeichneten sozialen Regeln wurden vom Nutzer bestätigt; andere Empfehlungen bleiben Entwurf. Punkte mit **(S)** benötigen vor Umsetzung des jeweiligen Pakets eine ausdrückliche Nutzerentscheidung.

| # | Frage | Vorläufige Empfehlung | Paket |
|---|---|---|---|
| D1 **(S)** | Zeigt `#npc` offene Absprachen mit Alaric? | **Entschieden (Nutzerfreigabe E2-B, 09.11.2026):** ja, nur offene persönliche Absprachen mit `who ⊇ {pc, id}`; keine NPC↔NPC-, geheimen/privaten, nicht etablierten oder erledigten Absprachen als „offen“ | E2-B (.172) |
| D2 **(S)** | Persönlichkeit nur aus gezeigtem Verhalten, nie aus Spielerbehauptung? | **Entschieden (Nutzer, 09.11.2026):** nur tatsächlich gezeigte eigene Worte oder Handlungen der Figur; keine Zuschreibung des Spielers und keine erfundene Biografie. Situative Stimmung bleibt situativ. | E3 |
| D3 **(S)** | Anker frühestens aus späterer Begegnung (Nachweis `meeting`-Erinnerung vor aktueller Spanne)? | **Entschieden (Nutzer, 09.11.2026):** ja; frühere gemeinsame Erinnerung muss vor der aktuellen Anwesenheitsspanne liegen (`m.turn < scene.since[id]`). Weitere Züge derselben durchgehenden Spanne sind weiterhin dieselbe Begegnung; Name oder Absprache zählen nicht als Ersatz. | E3 |
| D4 **(S)** | Wie lange bleibt eine eingelöste Absprache auf der Karte? | **Entschieden (09.11.2026):** als `settled between you`, bis eine jüngere bedeutsame gemeinsame Erinnerung mit der Person existiert; erledigt bleibt erledigt (kein Wiederöffnen, keine Verlängerung, Historie bleibt); die alte Versprechens-Erinnerung erscheint nicht als offene Pflicht | E2-B (.172) |
| D5 | Historische Sammelpersonen | keine Migration; nutzbar, nie Ziel von `keptHere` | E2-A |
| D6 **(S)** | Zählt ein ausdrücklich aufgeschobenes Angebot mit Bedingung (Brenna-Dinner) als Absprache? | **Entschieden (09.11.2026):** ja, als `promise` mit Parteien = Absprache, **erneut zu fragen**; nie Annahme, gebuchtes Essen, sichere Zustimmung oder automatische Sympathie. Unbeantwortete Einladung, Höflichkeit, abgelehntes Angebot: kein Absprache-Thread | E2-B (.172) |
| D7 | `#npc pin` | außerhalb E2/E3 (E4) | — |
| D8 | Budgeterhöhung | nein | alle |
| D9 **(S)** | Behält ein anwesender Bystander das Annahmewissen (wiry woman I73)? | ja, sie war anwesend und aufmerksam; nur der Bearbeiter kommt hinzu | E2-A |
| D10 | Soziale Erinnerungen einer abgelehnten, nicht angeforderten Szenenverlagerung (Tam I56) | beibehalten wie .158; kein E2-Punkt | — |
| D11 | Gilt das Überreichen der Gildenplakette als Engine-Besitz (B4-Fall I10)? | am bestehenden Besitzmuster entscheiden; keine neue Besitzkategorie | E2-B |
| D12 | Soll der bestehende unbelegte `enter`-Pfad für am Ort Gelassene später verschärft werden? | in E2-A nein; nach natürlichem Test anhand gezählter Fehleintritte entscheiden | nach E2-A |
| D13 **(S)** | Genügt eine Beobachtung in einer späteren Begegnung, oder braucht ein Anker Bestätigung in zwei Begegnungen? | **Entschieden (Nutzer, 09.11.2026):** eine klare, belegte Beobachtung in der späteren Begegnung genügt, ohne zusätzliche Bestätigungsstufe. Anker dürfen sich durch weitere belegte Erfahrungen entwickeln; Ersatz höchstens einmal je Prädikat und späterer Anwesenheitsspanne (R10). | E3 |

---

## 14. Freigabegrenze

**Stand 09.11.2026.** E2-A (.169–.171) und E2-B (.172–.173) sind umgesetzt und technisch gegengeprüft. D1, D2, D3, D4, D6 und D13 sind in §13 als entschieden dokumentiert. [E2-A-Kontrollreview](REVIEW_NPC_E2A171_PRODUKTDIFF_GPT.md) · [E2-B-Kontrollreview](REVIEW_NPC_E2B173_PRODUKTDIFF_GPT.md) · [Aktueller Produktstand](../03_AKTUELLER_PROJEKTSTAND.md).

**E3 ist im Design entschieden, aber noch nicht implementiert.** D2, D3 und D13 sind bestätigt; die Implementierung braucht weiterhin einen eigenen ausdrücklich freigegebenen Auftrag. Nach der Entscheidung gelten der vereinbarte R10-Umfang, die Testmatrix C1–C6, die Budgetmessung nach §9 sowie Produktpatchnote, Suite, Replay und ST-Smokes. Natürliche Modellbefolgung bleibt ein eigener Nachweis.

Der gemessene Tam-Fall mit erledigter Absprache (+47 geschätzte Tokens gegenüber .171) ist ein zusätzlicher Messpunkt für die E3-Kontextarbeit. Abruf und Parteienbindung bei einer späteren Verdichtung mitprüfen. [Budgetbefund aus dem .173-Kontrollreview §4](REVIEW_NPC_E2B173_PRODUKTDIFF_GPT.md#4-replay-testdaten-und-kosten).

E4/E5, PULSE D, Stealth S2, Kampf und Wirtschaft bleiben eigene Pakete und Entscheidungen.

---

## 15. Änderungen nach dem GPT-Gegenreview (08.11.2026)

Alle fünf P2-Punkte wurden unabhängig am .168-Code geprüft (read-only; kein Produkt-, Test- oder Replaywechsel).

| Review | Prüfung am Code | Entscheidung im Plan |
|---|---|---|
| **P2-A** `met` ohne Erzählbeleg | bestätigt: `knownAt` (catalog.js:48) prüft die Antwort nicht; am Ort Gelassene passieren `enter` ohne Beleg (`absentKnown`, world.js:444; `probe_keep` b) | R1: `{who, evidence}` je Person, `narratedEvent` + Identifikationsregel, Bindung an Ankunft genau dieses Schritts über `outcome.known_at`; Gegenfälle A1a–A1g |
| **P2-B** `handled_by` ohne Bearbeitungsbeleg, bedingte Schritte | bestätigt: `quest.accept` und `quest.turn_in` liefern außerhalb der Halle `conditional`/`arrive_guild_hall` (commands.js:1292/1333), Ausführung erst in world.js L2475 ff. mit `cmd.completed`; `outcome.resolutions` hat `seq`/Status, aber keine Quest-ID | R2: `desk` für `resolved` und `conditional`, Bindung an Status bzw. `cmd.completed ok` des `seq`, Quest über neues `outcome.desk`; Handlungsbeleg mit Bezeichnung oder Pronomen-Bezugsregel (Satzfolge der I64-/I74-Originalprosa gelesen, Regel nicht ausgeführt); Gegenfälle A2a–A2c, A3a–A3e |
| **P2-C** `thread.who` nicht persistent, Verschmelzung | bestätigt: `threadEvents` (threads.js:103–122) baut das Objekt ohne `who` neu, `matchThread` (L39) vergleicht nur Wörter/Kind; `delta.js` reicht durch, `thread.set` ersetzt vollständig | R7: `who` = Parteien inklusive `pc`, `threadEvents`/`matchThread` partnerbewusst, `pc` nur bei Anwesenheit, Panel nur bei `who ⊇ {pc, id}`; B2–B2e, B5 |
| **P2-D** `knows` erneut verdrängt | bestätigt am geplanten Kopf + drei Felder | R8: Absprache in der Haltungszeile, `knows` immer unter den zwei weiteren Feldern; B3 als Vierfachfall |
| **P2-E** „zweite Szene“ durch Namensausnahme verletzt | bestätigt: geplante Bedingung „benannt ODER …“; der Zustand kennt keinen Beginn der aktuellen Anwesenheit; die einmalige `meeting`-Erinnerung trägt einen Zug | R10: Nachweis `meeting`/gemeinsame Erinnerung vor `scene.since[id]` (abgeleitet im Fold); Name nur Priorität; Stimmungsprüfung und Ersatz je späterer Spanne; C1–C5; D3/D13 als offene Wahl markiert |

**Übernommene P3-Punkte:** Gruppenübergang zur handelnden Einzelperson (R3, A4); Sprecherlabel auf Sprechprädikate begrenzt (R5, A6); `stripOwned`-Teilstücke mit allen Prüfungen und Replay-Hinweis (R9, B4a–B4d, §11); Ankunftskarten nur bei autorisiertem GO ohne bekannte Zwischenstation, mit Slotvorrang für laufenden Dialog (R6, B1a/B1b); Aufwand korrigiert (§10), Extractortokens als vorläufige Schätzung mit Messpflicht (§9). Nicht übernommen: nichts. Die Ownership-Lücke für `expected`-Schritte (A7) und `outcome.desk` sind eigene Ergänzungen aus der Codeprüfung.


## 16. Gezielter GPT-Nachcheck des überarbeiteten Plans (08.11.2026)

Der Nachcheck nach Commit `3a7e2ce` bestätigt die fünf ursprünglichen P2-Korrekturen grundsätzlich. Zwei **eng begrenzte technische Unstimmigkeiten** wurden hier in den Regeln selbst berichtigt (keine neue Architektur- oder soziale Entscheidung):

1. **GO-Status R6:** `src/v4/commands.js::go` gibt bei einem gültigen normalen GO `status:'authorized'`, **nicht** `resolved`, zurück. Deshalb verwenden R6, `arrivalPeople()`, §7 und Regression B1 nun `authorized`. Ob der Spieler das Ziel **wirklich erreicht**, bleibt ein separater Nachweis des World-/Extractorpfads. Die Ankunftskarte behauptet weiterhin keine tatsächliche Anwesenheit.
2. **Präsenzbeleg R1:** Eine wörtliche nicht hypothetische Narrationsstelle + eindeutige Personenreferenz beweisen für sich noch keine **physische Anwesenheit der Person** (z. B. ein Bild des Clerks). §8 ergänzt die notwendige Präsenzsemantik, Test A1h den negativen Gegenfall und die positive Kontrolle. Es wird kein neuer Automatismus und kein neuer Modellaufruf eingeführt.

Beide Änderungen sind **ausschließlich Fachplanung auf `main`**, keine Umsetzung/Freigabe. Die vorläufigen sozialen Nutzerentscheidungen in §13 bleiben offen. Siehe den separaten GPT-Kontrollreview in dieser Patchplan-Sammlung.
