# .172 — NPC E2-B: Wiederbegegnungen und persönliche Absprachen

**Basis:** `.171` / `4980db1b7ef2f449951882082afb661453a7cb00`. Umsetzung des freigegebenen Pakets E2-B aus [`patch_plans_10b/NPC_E2_E3_FACHPLAN.md`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/patch_plans_10b/NPC_E2_E3_FACHPLAN.md) (§2 R6–R9, §4 E2-B, §7, §9, §12 B1–B5) mit den entschiedenen Fragen **D1, D4, D6** (§13).

**Nicht enthalten:** E3 (Persönlichkeitsanker, `scene.since`, `manner`/`interest`), E4 (Salienz), Haltungs-/Beziehungspunkte, NPC-Eigenleben, PULSE-Änderungen, Migration alter Threads. E2-A (.169–.171) bleibt unverändert; keine Haltungsänderung, kein neues Event, kein neuer Modellaufruf.

## 1. Was E2-B tut

| Regel | Umsetzung |
|---|---|
| **R6 – Ankunftskarten** (`context.js` `arrivalPeople`) | Nur wenn der **letzte** GO-Schritt des Zugs `authorized` ist, kein GO-Schritt des Zugs eine Zwischenstation (`stop`) hat und das Outcome für genau diesen Schritt `known_at[seq]` trägt. Kandidaten ausschließlich `outcome.known_at[seq]`, lebend, nicht anwesend. Rang: in der Eingabe benannt > offene Absprache mit Alaric > bedeutsame gemeinsame Erinnerung > jüngste Begegnung mit ihm, Gleichstand nach `id`. **Slots:** anwesende Personen mit Interlocutor-Punkten ≥ 400 (benannt/Handlungspartner) behalten ihren Kompakt-Slot, Ankunftskarten füllen den Rest bis zwei; ein Slot, den keine Ankunftskarte braucht, bleibt beim nächsten Gesprächspartner am Abreiseort. Abschnitt `npc_arrival` (Prio 0, nach `npc_compact`): „ARRIVING AT <Ort> — people known there; NOT YET SHOWN: present only if the story shows them there“, je Person die Kompaktkarte des Abwesenden (Kopf endet auf `; NOT YET SHOWN`, das Label überlebt die Kappe). Der `KNOWN AT`-Satz des Erzählers nennt nur Personen **ohne** Karte (alle gekartet: „the people carded under ARRIVING AT“); der Extractor liest die volle Zeile weiter aus `outcome.extra`. Kein `scene.entered`, keine Anwesenheit aus der Karte. E0: `diagnostics.arrivalNpcIds`, `delivered[npc_arrival]` mit IDs und Tokens. |
| **R7 – Absprachen mit Parteien** | `deltas.json` `thread.who` (`string[] \| null`). `world.js` (`case 'thread'`, Ruleset 2, C-Pfad, nur `promise`/`debt`): Refs über `mapRef` (auch `person.new` derselben Antwort), nur existierende lebende NPCs und `pc`; `pc` nur, wenn eine NPC-Partei nach den Anwesenheitsdeltas dieser Antwort anwesend ist; höchstens drei; ohne NPC-Partei kein `who` (Verhalten wie .171). `delta.js` reicht unverändert durch. `threads.js`: `threadEvents` behält `cur.who` bei Aktualisierung und Erledigung (auch ohne `who`), ergänzt Parteien, entfernt keine; `matchThread` mit Parteien sucht zuerst die Threads dieser Parteien (exakter Text, dann Wortnähe ≥ 0,6 nur bei genau einem Treffer) und einen alten Thread ohne Parteien nur bei exakt gleichem Text. Fold/`thread.set` unverändert (das Feld reist im Thread-Objekt). |
| **R8 – Karten** | `npcCard`: `open between you:` (offene `promise`/`debt` mit `who ⊇ {pc, id}`, höchstens zwei, neueste zuerst) und `settled between you:` (jüngste erledigte, solange keine bedeutsame gemeinsame Erinnerung eines **späteren Zugs** existiert, D4). Erinnerungszeilen, die älter sind als eine erledigte Absprache und von ihr handeln (≥ 3 gemeinsame Wörter außer Namen), tragen im Datum `; settled since`. `compactNpcCard`: Kopf + `toward Alaric` (+ `; between you: <neueste offene>` bzw. `; between you: settled — <Text> (<Erledigung>)`, zuerst die Absprache gekürzt, unter 40 Zeichen Platz entfällt sie) + die ersten zwei von `last meaningful` → `knows` → `also remembers`; jede Zeile ≤ 170. Fällt die Absprache aus der Kompaktkarte, zeigt der Zusatzabruf der Person die Detailzeilen. Abrufitems `kind:'thread'`: `entities` = NPC-Parteien. |
| **R9 – Erinnerungsrest** (`ownership.js` `stripOwned`, nur `store:'memory'`) | Ein besessenes Satzglied wird außerhalb von Zitaten nur **vor einem zweiten Prädikat** geteilt (`, and`/`and`/`then` + Verb mit gemeinsamem Subjekt oder Name/Pronomen + Verb; nie in „the fisherwoman and the fishers“). Ein Teilstück bleibt nur, wenn es ein eigener Satz ist (kein „to …“/„-ing“-Fragment, kein Pronomen-Teil ohne Bezug), kein Engine-Vokabular enthält (contract, slip, seal, stamp, READY, plate, rank, register, ledger, board, bounty, deposit, payout, reward, pay, coin, copper/silver/gold, XP), keine bestehende Besitzprüfung auslöst, die `pc_decision`-/Todesprüfung der Welt besteht und direkte Rede oder ≥ 6 Wörter hat. Ablehnungsart und Statusansprüche werden weiter aus dem ganzen Satzglied gelesen. Andere Stores unverändert. |
| **`#npc` (D1)** | „Open between you:“ nur aus offenen `promise`/`debt`-Threads mit `who ⊇ {pc, id}`; NPC↔NPC, erledigte und parteilose Threads erscheinen dort nicht. |
| **D6** | Thread-Summary: ein ausdrücklich aufgeschobenes Angebot mit Bedingung ist eine Absprache, **erneut zu fragen**, nie eine Annahme; unbeantwortete Bitte, Höflichkeit, abgelehntes Angebot, Angebot an alle, engine-gebuchter Handel/Auftrag sind kein Thread. Regel PERSON CONTINUITY: „An agreement is one promise/debt thread with its parties (who), never also a fact.“ Keine Buchung, keine Haltung. |

`EXTRACTOR_VERSION`/Vokabularversion unverändert (an bestehende Tests gebunden, wie in E2-A).

## 2. Abweichungen und Präzisierungen

1. **Letzter GO-Schritt:** „letzter `authorized` GO-Schritt mit `known_at`“ wird streng gelesen: Karten nur, wenn der letzte GO-Schritt des Zugs selbst `authorized` ist und `known_at` hat; geht die Nachricht danach weiter (B1b), gibt es keine Karten. Jede Zwischenstation eines GO-Schritts des Zugs schließt Karten aus.
2. **D4 „jünger“** heißt: bedeutsame gemeinsame Erinnerung mit `turn` größer als der Zug der Erledigung. Eine Erinnerung derselben Antwort, die erledigt, beendet `settled` nicht.
3. **Alte Threads ohne Parteien** erhalten Parteien über ihre ausdrückliche `id` oder exakt gleichen Text; eine Umformulierung mit Parteien wird ein neuer Thread (B2e).
4. **R9 enger als im Plan formuliert:** zusätzlich zu den bestehenden Prüfungen verlangt ein Teilstück einen eigenen Satz und kein Engine-Vokabular. Grund: Replay-Befund vor dieser Verschärfung – isoliert erkannten die bestehenden Prüfungen „stamped his Glimmerdeep slip READY“, „closed the Reed Flat contract“, „he stamped a NOVICE plate“ nicht als Engine-Teil, und die Teilung an bloßem „and“ zerschnitt Nominalgruppen. Nach der Verschärfung behält im ganzen Korpus genau ein Record einen neuen sozialen Rest (§3).
5. **Verdrängter Gesprächspartner:** wer am Abreiseort steht und keinen Slot behält (Punkte < 400), erscheint wie jede anwesende Nicht-Fokusperson mit seiner Detailkarte im Abschnitt `present` (Prio 1; unverändertes Verhalten dieses Abschnitts). Kosten in §3.
6. **ST-Smoke:** die .169-Prüfung `npc169_metNarratorKnownAtUnchanged` verlangte „kein ARRIVING AT“; E2-B ändert genau das. Sie ist durch `npc169_metNarratorArrivalCards` ersetzt (Karten beim Erzähler, `KNOWN AT` verweist auf sie, Extractor mit voller Zeile).
7. **`who:null` im Echo:** Aufgezeichnete Antworten ohne `thread.who` erhalten vom Parser den Standardwert `null`; in abgelehnten Thread-Items steht er nun im Event-Echo (reine Darstellung, §3).

## 3. Abnahme

| Prüfung | Ergebnis |
|---|---|
| Rot gegen unverändertes .171 | `npc_e2b.test.js` + `npc_e2b_host.test.js`: **13 von 16 rot**. Grün auch auf .171 nur die Schutzfälle B1b (keine Karte bei Zwischenstation, Weiter-GO, abgelehntem GO, Ort ohne Bekannte), B2b (Fold-Gleichheit) und B4a–d (nichts behalten). Extractorantworten synthetisch; Spielerzüge, Prosa und Zustände aus User01 (`user01_e2b172.json.gz`, bis I70), User02 und User04. |
| Neue Regressionen | **16/16 grün:** B1, B1a, B1a2 (freier Slot bleibt beim Gesprächspartner), B1b, B2/D4, B2a, B2b, B2c/B2d/B5 (`#npc`), B2e, D6, B3, B4, B4a–d, B4e (sechs Replay-Erinnerungstexte); Host: Bindung über den Parser, Ankunftskarte mit Absprache, `KNOWN AT` nur beim Erzähler gekürzt, Swipe/Regenerate/Edit gleiche Karte, Erledigung ohne `who` behält Parteien, Save/Reload und regenerierte Antwort foldgleich, Folgezug „settled“. |
| E2-A und angrenzend | `npc_e2a*`, `fix158`, `fix160`, `fix161`, `gen35_ownership`, `coverage` grün (97/97 vor dem Build); E2-A-Erwartungen unverändert. |
| `npm test` | **2961/2961** |
| Replay `.126`-Baseline | 2235 Fälle, 1048 abweichend, **alle mit exakter Ausgabe akzeptiert** (`accepted_e2b172_vs_126.json`; `accepted_e2a169_vs_126.json` unverändert). Gegenüber .171 genau **11 Records** geändert, je einzeln gegen die exakte .171-Ausgabe geprüft: **10** nur `"who":null` im Echo bereits abgelehnter Thread-Items (`e2b172 thread who field`; gleiche Regel, gleicher Grund, kein Thread/Event/Korrektur anders), **1** neuer sozialer Erinnerungsrest `b17-warrior#254` „The Alderwatch desk clerk told him not to spend it on drink before noon.“ statt vollständiger Ablehnung (`e2b172 memory social rest`; eine Ablehnung weniger, kein Geld-/Quest-/Presence-Event). 1037 Einträge byte-gleich, 4 mit erhaltenem `previous_acceptance_169`, 7 neu; `returned` unverändert. |
| ST1.19 Standard | `LIVE SILLYTAVERN SMOKE C: OK`, **143** Prüfungen wahr, keine falsch (.171: 134), davon 9 neue `npc172_*` (`tools/st_live/npc172_smoke.mjs`, User04 ab der Herberge): Absprache gebunden, eine Ankunftskarte lässt der Schreiberin ihren Slot, Ankunftskarte mit Absprache, `KNOWN AT` beim Erzähler ohne sie, Extractor mit voller Zeile, Erledigung ohne `who` behält Parteien, Save/Reload, Regenerate mit genau einer Erledigung, Folgekarte „settled“. `npc169_metNarratorKnownAtUnchanged` ist durch `npc169_metNarratorArrivalCards` ersetzt (§2.6). |
| ST1.19 Failsoft | `OK`, **148** wahr, keine falsch (.171: 139) |

**Kontext und Prompt** (Engine-Schätzer, Budget 1400/800, Spielerzüge mit ihren aufgezeichneten Befehlen auf dem jeweiligen Build neu ausgeführt, damit `known_at` vorliegt; `recorded` = gespeicherte Events):

| Zug | .171 Tokens (budgetiert) | .172 | Δ | Abschnitte |
|---|---|---|---|---|
| User01 I61 (GO Halle) | 1496 (1307) | 1456 (1266) | **−40** | `npc_arrival` 258 (Brenna, Doran) ersetzt `npc_compact` −83 (Marda); `present` +57 (Marda, Detailkarte); `KNOWN AT` −37; `lore` (236) verdrängt |
| User01 I62 (recorded) | 1504 | 1504 | 0 | – |
| User01 I69 (kein GO) | 1727 | 1722 | −5 | Kompaktkarte `knows` vor `also remembers` |
| User02 I62 (recorded) | 1563 | 1563 | 0 | – |
| User02 I63 (GO Halle) | 1422 (1278) | 1457 (1315) | **+35** | `npc_arrival` 207 (Tam, Bess); `npc_compact` −79; `present` +53; `KNOWN AT` −43; `relevant` (337) verdrängt, `lore` (236) passt |
| User02 I73 | 1610 | 1610 | 0 | – |
| User04 I71 (GO Halle) | 1463 (1321) | 1308 (1166) | **−155** | `npc_arrival` 160; `npc_compact` −80; `present` +54; `KNOWN AT` −36; `relevant` (340) verdrängt, `lore` +87 |
| User04 I72 (recorded) / I73 | 1693 / 1561 | 1693 / 1561 | 0 / 0 | – |
| B3 (I69 + offene Absprache) | 1727 | 1745 | **+18** | `npc_compact` +18 (Absprache in Zeile 1) |
| D4 Tam offen / erledigt (User02 I54ff., synthetisch) | 1453 / 1437 | 1473 / 1484 | +20 / **+47** | Kompaktkarte +20 / +26; erledigt zusätzlich `relevant` +21 (der erledigte Thread wird über seine Partei gefunden) |

Grenzen §9: GO-Züge ≤ +40 (gemessen −155 bis +35), Nicht-GO ≤ +15 (−5/0), Absprache je Karte ≤ +25 (+18/+20; erledigt **+26**, von der 170-Zeichen-Kappe begrenzt). Der erledigte D4-Fall überschreitet als ganzer Zug +15, weil zusätzlich der planmäßig personengebundene Abruf greift (Prio 2, budgetgebunden). Kein neuer Prio-0-Abschnitt außer `npc_arrival`, **keine Budgetänderung**, **0 zusätzliche Modellaufrufe**. Extractor-System **+105** Tokens (10 806 → 10 911, freie-Hilfe-Vokabular; Planschätzung +60), Shape `who:string[]|null` und Thread-Summary; `expected` unverändert. Antworttokens für `who` nicht gemessen (geskriptet).

## 4. Grenzen

- **Freier Extractor/Erzähler:** Ob ein Modell `who` zuverlässig meldet und die Ankunftskarte als „noch nicht gezeigt“ behandelt, ist nicht belegt; Smoke und Hosttest sind geskriptet. Fehlt `who`, bleibt alles wie .171.
- **Prio-0-Anteil in GO-Zügen** wächst mit zwei Ankunftskarten um ≈ 120–140 Tokens; der Packer hält das Budget, verdrängt dafür aber niedriger priorisierten Abruf (`relevant` bzw. `lore`) in diesen Zügen.
- **Konservatives R9:** soziale Reste neben Engine-Vokabular oder in Infinitiv-/Partizipfragmenten gehen weiter verloren (z. B. „to ask for Ossler at the camp“).
- **Sammelentitäten** (`npc.npcguild_clerks`) bleiben eine Partei; keine Nachtrennung.
- Unabhängiger Produktdiff-Review steht aus; E3/E4 nicht begonnen.
