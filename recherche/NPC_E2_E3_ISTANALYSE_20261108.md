# NPC E2/E3 – technische Ist- und Ursachenanalyse auf .168

**Stand: 08.11.2026 · reine Analyse, keine Produktänderung.** Produktbuild `4.3.0-c.6.6.168` bleibt unverändert; diese Datei begründet den [Fachplan E2/E3](../patch_plans_10b/NPC_E2_E3_FACHPLAN.md). Historische Grundlage bleibt vollständig die [NPC-Kontinuitätsanalyse vom 04.11. mit GPT-/Sol-Gegenreviews §§9–10](NPC_KONTINUITAET_ANALYSE_20261104.md); hier wird sie gegen den aktuellen Code geprüft, nicht ersetzt.

**Kennzeichnung:** **[B]** bestätigt durch Code und tatsächlich ausgeführte Probe auf .168 · **[C]** im Code belegt, ohne eigene Ausführung · **[H]** Hypothese · **[E]** offene Designentscheidung. Spekulative Aussagen erscheinen nie als reproduzierter Fehler.

---

## 1. Produktstand und Quellen

| Gegenstand | Verifizierter Stand |
|---|---|
| Produktbranch | `claude/c-planner-prototype-2026-10-02-gpt-c666` · Remote-HEAD [`8c7ee1f`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8c7ee1f55f3d4c052d2baacb3790919e2396c980) (Build .168), vor Analysebeginn und vor dem Commit erneut abgefragt |
| Dokumentation | `main` · Remote-HEAD `f7f2b8b` bei Analysebeginn |
| Arbeitsweise | Produkt als losgelöster Worktree auf `8c7ee1f` gelesen; `git status` blieb leer. Keine Produktdatei, kein Test, keine Replayakzeptanz geändert, kein Build, kein Modellaufruf |

**Gelesene Projektquellen:** [01](../01_ARBEITSWEISE_CHATGPT_CLAUDE.md), [02](../02_DESIGN_KANON.md) (NPC-Wissen, Gesprächskontinuität, Flirt ohne automatische Zuneigung), [03](../03_AKTUELLER_PROJEKTSTAND.md), [07 §2](../07_ROADMAP_NACH_10B_ENTWURF.md#2-npc-kontinuität--neue-fachliche-reihenfolge), historische Analyse inklusive §§9–10, [Patchnote .158](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/8c7ee1f55f3d4c052d2baacb3790919e2396c980/avereth-engine/docs/FIX158_USER02_NPC_CONTINUITY.md), [User04-Review §6](../testrun_10b/user-20261106-072640/REVIEW.md#6-npc-e0e1-diagnose-und-auslieferung-funktionieren-inhaltliche-kette-hat-lücken), [User02-GPT-Review](../testrun_10b/user-20261105-050449/REVIEW_CHATGPT.md) §§3D/4/8.

**Gelesener Produktcode (.168):** `src/context.js`, `src/knowledge.js`, `src/threads.js`, `src/state.js`, `src/delta.js`, `src/commands.js` (`#npc`), `src/v4/world.js`, `src/v4/commands.js`, `src/v4/catalog.js`, `src/v4/runtime.js`, `src/v4/extract.js`, `src/v4/narration_evidence.js`, `src/v4/guild.js`, `src/v4/ownership.js`, `src/v4/scene_handles.js`, `src/v4/pulse.js`, `content/deltas.json`, `tests/v4/fix158_continuity.test.js`.

**Ausgewertete Originalläufe:**

| Lauf | Datei | Fall |
|---|---|---|
| User01 | `testrun_10b/user-20261104-162404/originals/chat.jsonl` | Brenna (I52–I70) |
| User02 | Produktfixture `tests/v4/fixtures/user02_157.jsonl.gz` | Tam Ostler als Positivkontrolle, Marda |
| User04 | `testrun_10b/user-20261106-072640/originals/chat.jsonl.gz` | Gildenschreiber, Crossbowman, Harl Vess |

**Tatsächlich ausgeführte Nachweise** (Skripte unverändert unter [`npc_e2_e3_probes/`](npc_e2_e3_probes/README.md)):

1. `foldChat` der Originalrecords mit dem .168-Code: zeigt den **historisch persistierten** Zustand (gespeicherte Events), nicht eine neue Extraktion.
2. `turnBlock` mit dem .168-Kontextcode über diesem Zustand, Budget 1400 / Regelbudget 800: zeigt, **was der aktuelle Code heute ausliefern würde** (Abschnitte, NPC-IDs, `budgetedTokens`).
3. Direkte Aufrufe von `presenceInReply` und `guildParticipationEvidence` auf der Originalprosa plus Kontrollsatz.
4. Ereigniszählung über alle Records (Prädikate, Threads, Ablehnungen).
5. Gezielte lokale Reproduktion mit `replyTurnV4`: Zustand nach dem Spielerzug I71 (User04), Originalprosa I72, **synthetische** Extractorantworten (`probe_keep`). Sie zeigt das Firewallverhalten für Deltas, die der historische Extractor nicht geliefert hat.

Indizes `I<n>` zählen ab der ersten sichtbaren Chatnachricht (Zeile 2 der `.jsonl`), wie in den bisherigen Reviews.

---

## 2. Architektur nach .158: Speicherung → Persistenz → Auswahl → Auslieferung → Verwendung

Die fünf Stufen sind getrennt zu prüfen; ein Fehler auf einer Stufe ist kein Beleg für die nächste.

| Stufe | Komponente (.168) | Verhalten |
|---|---|---|
| **Speicherung** | Deltas `person.new`, `person.named`, `enter`, `leave`, `fact`, `learn`, `attitude`, `memory`, `thread` ([`content/deltas.json`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/8c7ee1f55f3d4c052d2baacb3790919e2396c980/avereth-engine/content/deltas.json)) | Alles sind Events im Nachrichtenrecord; Fold baut daraus `entities`, `facts`, `claims`, `knowledge`, `memories`, `threads`, `relations`. Keine zweite Datenbank. |
| **Gültige Persistenz** | Firewall [`world.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/8c7ee1f55f3d4c052d2baacb3790919e2396c980/avereth-engine/src/v4/world.js#L1025) | `person.new` (L1025–1112): exakter Name/Erweiterung/`distinct_from`; bekannte Person am Ort → `enter`; unbenannte Dienstrolle → `keptHere` (L1945) bildet auf die zuletzt hier gelassene Person derselben Rolle ab. `enter` (L1132): Bekannte, deren Ort ein anderer ist, nur mit `presenceInReply` (narration_evidence L164); wer an diesem Ort gelassen wurde, tritt ohne Beleg ein (`absentKnown`, L444). `fact` (L1238) mit exaktem Objektresolver (.158). `memory` (L1278) über `stripOwned` (ownership L384, satzgliedweise). `thread` (L1299) nur `id/text/kind/status/resolution`. `attitude` (L1275) → `relations`. |
| **Wissen** | `witnessEvents` ([`guild.js:35`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/8c7ee1f55f3d4c052d2baacb3790919e2396c980/avereth-engine/src/v4/guild.js#L35)); `deskWitnesses` (world L384/L1147/L2510) | Annahme/Abschluss: Wissen erhalten anwesende, wahrnehmende NPCs. .158-Nachtrag nur für einen **auf Ankunft wartenden Abschluss**: ein in derselben Antwort eingeführter Bearbeiter wird Zeuge, wenn `guildParticipationEvidence` (L189) eigene Bearbeitung im Satz belegt. Für die Annahme gibt es keinen solchen Nachtrag. |
| **Kontextauswahl** | [`context.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/8c7ee1f55f3d4c052d2baacb3790919e2396c980/avereth-engine/src/context.js#L843) | `interlocutors` (L843): nur **anwesende** lebende NPCs, Punkte für Namensnennung/Handlungspartner/jüngstes Gespräch/Erinnerungstreffer, höchstens zwei → `npc_compact` (L626, Prio 0). `compactNpcCard` (L857–861): Kopfzeile auf 170 Zeichen + die **ersten drei vorhandenen** von `toward Alaric:` / `last meaningful:` / `also remembers:` / `knows:`, je 170 Zeichen. `npcContinuity` ([knowledge.js:228](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/8c7ee1f55f3d4c052d2baacb3790919e2396c980/avereth-engine/src/knowledge.js#L228)): benannte Abwesende, höchstens drei. `RECORD_PREDICATES` (L36): `occupation`, `appearance`, `voice`, `agenda`. |
| **Ankunft** | [`v4/commands.js:678`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/8c7ee1f55f3d4c052d2baacb3790919e2396c980/avereth-engine/src/v4/commands.js#L678), `knownAt` ([catalog.js:48](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/8c7ee1f55f3d4c052d2baacb3790919e2396c980/avereth-engine/src/v4/catalog.js#L48)) | Bei autorisiertem GO eine Zeile `KNOWN AT <Ort> (…): <Label> (<id>) · …` (höchstens vier, `e.at === Ziel`, lebend, nicht anwesend) in `ctx.extra`. Sie erreicht den Erzähler (Abschnitt `resolved`) und über `runtime.js:841` auch den Extractor. Keine Karten, nur Name/Rolle/ID. |
| **Auslieferung** | Packer (`context.js:779`) und E0 (`narration.context`) | Prio 0 immer (darf das Budget überschreiten), Prio > 0 nach Restbudget; E0 hält gelieferte/verworfene Abschnitte, NPC-IDs, Fokus-IDs und `budgetedTokens` fest. |
| **Modellverwendung** | — | Nur über die Prosa beurteilbar; kein eigener Messpunkt. |

**Erwartete Extractorfelder:** `expectedKeys` gibt es nur für `activity`, `buy`, `go` (`{arrived, at, with}`), `pay`, `sell`, `take` ([`extract.js:86`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/8c7ee1f55f3d4c052d2baacb3790919e2396c980/avereth-engine/src/v4/extract.js#L86)). `quest.accept` (commands L1292) und `quest.turn_in` (L1333) haben keines. **[C]**

**Spieleransicht:** `#npc <name>` (`src/commands.js:329`) zeigt Alarics Wissen über die Person und gemeinsame Momente, keine Erzählerkarte. **Haltung:** `attitude ≥ 20` macht einen NPC in `sideOf` (scene_handles L185–188) zum `ally`; soziale Haltung ist damit bereits kampfwirksam. **[C]**

---

## 3. Abgleich historische Analyse ↔ .168

| Historischer Befund (04.11.) | Stand .168 | Nachweis | Status |
|---|---|---|---|
| §2.2 / §3.2 Brenna-Karte bei I70 budgetbedingt verloren | Kompaktkarte Prio 0. Rekonstruktion I69: Brennas Karte geliefert, `knows him by name`, Abendessen-Aufschub als `last meaningful` | Probe 2, User01 I69 (`npc_compact[npc.npcglassmere_clerk,…]:285`) | **gelöst [B]** |
| §2.3.1 Faktobjekt durch Personen-ID ersetzt | exakter Resolver an beiden Übergängen | `fix158`-Test „free fact beginning with Tam is text…“, Code world L1238 / delta.js | **gelöst für neue Züge [C]**; historische Records behalten `o: npc.npcglassmere_clerk` (I66, Probe 4) |
| §2.3.2 Abgabe ohne Wissen der Schreiberin | Nachtrag für wartenden Abschluss + wörtlicher Bearbeitungsbeleg | .158-Tests L120/L132; .158-Patchnote nennt die Prüfung „bewusst konservativ“ | **teilweise**: bei Pronomen-Satzbau weiter offen, siehe F1 **[B]** |
| §2.3.3 Verabredung nicht als `promise` erfasst | Extractor legt `promise`-Threads an (User02: 3, User04: 1), aber ohne NPC-Bindung; Brennas Aufschub nur als Erinnerung | Probe 4 | **offen**, F8 **[B]** |
| §2.3.4 falsche NPC-Aussage als öffentlicher Fakt | unverändert; gleiche Klasse bei User04 I72 | Probe 4 | **offen**, F5 **[B]** |
| §2.3.5 Erster Eindruck als Dauermerkmal | Brennas Kopfzeile endet weiter mit „gave Alaric the measuring look the counter gives…“ (170-Zeichen-Schnitt) | Probe 2 | Darstellung **[B]**, Wirkung auf die Erzählung **[H]** |
| §3.3 Brennas falsche Aussage bei Rückkehr I62 | Beim GO-Zug ist der Kontext noch am Ausgangsort; Brenna nur als `KNOWN AT`-Zeile | Probe 2, User01 I61 | **Ursache besteht**, F6 **[B]** |
| Sol §10.2 B: Haltung kampfwirksam | unverändert | Code | **Grenze bleibt [C]** |
| Sol §10.2 C: Erzählerkarte ≠ Spielerpanel | unverändert | Code | **Grenze bleibt [C]** |

**Etappenkennungen:** Die Originaltabelle (§6) zählt bis E6, 07 nennt E0–E5. Diese Analyse übernimmt keine alte E4–E6-Nummerierung und benennt Pakete zusätzlich nach Fachthema.

### 3.1 Übersicht Phase A

| Funktion / Fehler | Bereits vorhanden? | Funktioniert nachweislich? | Verbleibende Ursache | E2/E3 relevant? |
|---|---|---|---|---|
| **NPC-Identität** | Ja: `person.new`-Regeln, `keptHere`, `distinct_from`, exakter Faktresolver | Für einzelne Personen ja (Brenna, Tam, Marda stabil) **[B]** | Sammelperson `npc.npcguild_clerks` aus „Two clerks …“ (User04 I6) wird als eine Person geführt; `keptHere` bildet einen anders beschriebenen unbenannten Schreiber darauf ab (reproduziert) **[B]** | **E2** (Voraussetzung) |
| **Wiederanwesenheit** | Ja: `KNOWN AT` bei GO; `enter` (am Zielort ohne Beleg, anderswo mit `presenceInReply`) | Erfindet keine Anwesenheit **[B]**; erzählte Rückkehr wird nicht gebucht, wenn der Extractor kein `enter` meldet (User04 I72) **[B]** | Wiederbegegnung hängt an einem freien, optionalen `enter`; kein Pflichtfeld der GO-Antwort fragt danach; eine wörtliche Prosaprüfung wäre kein Ersatz (Plural/Umschreibung) | **E2** |
| **Persönliches Wissen** | Ja: `witnessEvents`, Abschlussnachtrag | Für anwesende Bearbeiter und wörtliche Belege ja (Tam) **[B]**; bei Pronomen nein (I64), bei Annahme durch nicht eingeführten Schreiber nein (I73/I74) **[B]** | Regex-Beleg statt strukturierter Angabe; für die Annahme kein Nachtrag | **E2** |
| **Relevante Erinnerungen** | Ja: `memory` ≥6, `last meaningful`/`also remembers` | Gespeichert und ausgeliefert, wenn der NPC anwesend ist **[B]** | Soziale Teilsätze werden mit Engine-Teilsätzen verworfen (Tam I10/I14) **[B]**; `knows` wird von `also remembers` verdrängt (Brenna I69) **[B]**; bei Ankunft keine Karte (F6) **[B]** | **E2** |
| **Offene Absprachen** | Teilweise: `thread` `promise`/`debt`, Lebenszyklus offen → erledigt | Lebenszyklus ja (User02 I54 → I58) **[B]** | Keine NPC-Bindung; Karte zeigt erledigte Absprache als aktuell (Tam bis I73) **[B]**; Absprachen landen auch als freie Fakten (`offer`, `promise`) **[B]** | **E2** |
| **Persönlichkeit** | Minimal: `voice`, `appearance`, `agenda` als Record-Prädikate; `traits` | Nicht genutzt: 0 `voice`/`appearance`/`agenda`-Fakten und 0 `attitude`-Events in allen drei Läufen **[B]** | Keine Extractor-Anleitung für Merkmale; Kopfzeile schneidet nach 170 Zeichen; erster Eindruck als Dauertext | **E3** |
| **Kontextbudget** | Ja: E0, Prio 0/Prio > 0 | Kompaktkarten nie verworfen (User04 36/36 laut Review) **[B]** | Pflichtabschnitte überschreiten 1400 regelmäßig (User04 21/36, bis 1944 laut Review; Rekonstruktion User02 I73: 2047) **[B]**; ein NPC-Slot geht bei GO an die verlassene Person | **E2/E3** (budgetneutral bleiben) |

---

## 4. Bestätigte offene Fehler mit Belegen

| ID | Kurzbefund | Beleg in | Paket (Fachplan) |
|---|---|---|---|
| F1 | Abschlusszeuge scheitert an Pronomen-Satzbau (User04 I64) | §4.3 #2 | E2-A |
| F2 | Erzählte Wiederanwesenheit ohne `enter` (User04 I72) | §4.3 #3 | E2-A |
| F3 | Sammelidentität; `keptHere` bildet anders beschriebene Person darauf ab | §4.3 #1 | E2-A |
| F4 | Annahmewissen beim Bystander, Bearbeiter fehlt, Satz fehlzugeordnet (User04 I73/I74) | §4.3 #4 | E2-A |
| F5 | NPC-Behauptung über Board als öffentlicher Fakt | §4.3 #5 | E2-A |
| F6 | GO-Zug: Gesprächspartnerslot an die verlassene Person | §4.1, §4.4 | E2-B |
| F7 | Kartenfeldreihenfolge verdrängt `knows`; Kopfschnitt trifft künftige Merkmale | §4.1, §4.4 | E2-B / E3 |
| F8 | Absprachen ohne NPC-Bindung; erledigte Absprache bleibt Kartenzeile | §4.1 I66, §4.2 #2/#4 | E2-B |
| F9 | Sozialer Teil gemischter Erinnerungen verworfen | §4.2 #1 | E2-B |
| F10 | Keine Persönlichkeitsdaten | §4.4 | E3 |

### 4.1 B1 – Brenna (User01)

| Index | Was passiert | Beleg |
|---|---|---|
| I52 | Ankunft + Abgabe in einer Nachricht; Brenna tritt erst danach ein, ihr Wissen bleibt „accepted“ (historisch). Auf .158+ würde der Abschlussnachtrag greifen, sofern die Prosa eine wörtliche Bearbeitung zeigt. Für diesen Originalsatz nicht neu ausgeführt. | historische Analyse §2.3.2; Code L2510/L1147 **[C]** |
| I61 → I62 | GO zur Gildenhalle. Rekonstruierter Kontext I61: `npc_compact[npc.marda]` (die **verlassene** Wirtin), Brenna und Doran nur in `KNOWN AT … Brenna, Guild clerk, stout woman … (npc.npcglassmere_clerk) · Doran …`. Ihre Kenntnisse und Erinnerungen fehlen dem Erzähler genau in der Rückkehrantwort. | Probe 2 **[B]** |
| I66 | Abendessen-Einladung aufgeschoben („ask again when he has more lines in her ledger“): als Erinnerung und als freie Fakten `dinner_response`/`will_tell_marda` gespeichert; die Fakten tragen historisch `o: npc.npcglassmere_clerk`. Kein Thread. | Probe 4 **[B]** |
| I69 | Brennas Karte: `toward Alaric` + `last meaningful` (Aufschub) + `also remembers` (Wirtshausempfehlung). `knows: … accepted contract …` fällt als viertes Feld weg. Kopfzeile abgeschnitten bei „…the measuring look the counter gives…“. | Probe 2 **[B]** |

**Bewertung:** Der historische Kernfehler (I70, Karte verdrängt) ist gelöst. Offen sind die Ankunft ohne Karte (F6), die Feldreihenfolge (F7) und die ungebundene Absprache (F8). Den I62-Satz „still showing active“ nicht erneut als reproduziert führen: Er stammt aus einem Pre-.158-Lauf, dessen Abschlusswissen der Nachtrag heute anders behandeln könnte. **Nicht neu ausgeführt.**

### 4.2 B2 – Tam Ostler (User02) als Positivkontrolle

**Funktioniert [B]:** Tam bleibt eine Identität und kennt Alarics Namen (`knows him by name`). Er ist bei Annahme und Abschluss anwesend und hält beide Wissensrows `f.pc.accepted…`/`f.pc.completed…`. Das Trinkversprechen wird bei I54 als `promise/open` angelegt und bei I58 `resolved` (Probe 4). Im Lauf werden 37 `fact.asserted`-, 34 `memory.recorded`-, 23 `knowledge.gained`- und 13 `thread.set`-Events angenommen.

**Bestätigte Lücken [B]:**

1. **Soziale Erinnerungen satzgliedweise verworfen.** I10 „Tam Ostler registered Alaric Red as a Novice, F Power Rank, and handed him his Guild plate“ und I14 „Tam Ostler stamped the Glimmerdeep contract active and wished Alaric luck: 'Come back with your skin on and we'll settle that drink.'“ werden vollständig als `engine_owned_memory` abgelehnt. `stripOwned` schneidet nach Satzgliedern; der Engine-Teil („registered … Novice“, „stamped … active“) und der soziale Teil („wished Alaric luck: '…'“) stehen im selben Glied. Gegen .168 erneut nachvollzogen.
2. **Erledigte Absprache bleibt „last meaningful“.** Bis I73 zeigt Tams Karte „[Day 1, 09:17] Alaric … promised to buy him a drink …; Ostler said he'd hold him to it“, obwohl der Thread seit I58 `resolved` ist. Die Karte kennt keine Threads.
3. **Erfüllungsmoment verloren.** I56 „Tam Ostler shared veteran tips over ale in the Guild back room after Alaric bought him a drink …“ (imp 7) wird als `scene_context` abgelehnt. Grund: Der Erzähler führte Alaric ohne Spieleraktion ins Hinterzimmer, `arrive` wurde `no_go` abgelehnt. Diese Ablehnung ist durch den .158-Test „original unaccepted I56/I68 scene switches remain rejected“ **bewusst festgeschrieben**. Der Erinnerungsverlust ist Folge der korrekten Bewegungs-Firewall, kein NPC-Speicherfehler.
4. **Absprachen doppelt oder nur als Fakt.** Tams Broker-Angebot (I58) existiert nur als freier Fakt `offer`. Mardas Vorkaufsrecht (I72) ist Fakt `promise` **und** Thread `promise/open`, beide ohne Bindung an Marda.

### 4.3 B3 – Gildenschreiber, Crossbowman, Harl Vess (User04): fünf getrennte Prüfungen

| # | Prüfung | Befund | Beleg |
|---|---|---|---|
| 1 | **Sammelidentität** | I6 `person.new` „Two clerks working the long counter at the back of the Guild entrance hall“ → **eine** Entität `npc.npcguild_clerks` (Label `clerk`). Die grauhaarige Schreiberin (I64/I66) und der ältere Schreiber (I72/I74) sind damit dieselbe Person. Lokale Reproduktion auf dem Zustand nach I71: Ein synthetisches `person.new` „older man with ink-stained fingers …“ (Rolle `clerk`, unbenannt) wird über `keptHere` (L1945) **auf `npc.npcguild_clerks` abgebildet**, kein neuer Mensch. `keptHere` nimmt bei genau einem Kandidaten gleicher Rolle diesen ohne Beschreibungsvergleich (`kept.length < 2`); `distinct_from` wird nur bei Namenserweiterungen ausgewertet (L1033). Dasselbe träfe daher auch eine einzelne bekannte Schreiberin **[C]**. | Probe 1 (`entity.created`), `probe_keep` (a) **[B]** |
| 2 | **Persönlicher Abschlusszeuge I64** | Die Prosa zeigt eigene Bearbeitung („She counted the coins out onto the counter …“, „she said, and took the slip“). `guildParticipationEvidence(I64, ["clerk", …], 90 cp)` = **false**; Kontrollsatz „The clerk counted out ninety copper onto the counter for the contract.“ = **true**. Endzustand: Die Schreiber kennen `accepted…catacombs`, **nicht** `completed…`. Dieselbe Ursache hat das User04-Review §6 gemeldet; die .158-Patchnote nennt die konservative Literalprüfung als Grenze. | Probe 3, Probe `probe_clerks` **[B]** |
| 3 | **Erzählte Wiederanwesenheit I72** | Die Prosa zeigt „both clerks at work this time: the woman who had spoken with him the night before, and an older man …“ und „the stocky man with the crossbow“. `KNOWN AT` mit beiden IDs stand in den Extractor-Actions. Der Extractor lieferte kein `enter` für sie, nur `person.new` für die neue wiry woman. Anwesend bleibt nur `[pc, npc.npcnpcwiry_woman]`. **Ursache ist allein das fehlende Delta:** Die Reproduktion (b) zeigt, dass `enter` ohne Prosabeleg angenommen würde, weil `absentKnown` (L444) Personen mit `at` = erreichter Ort nicht prüft. Gegenprobe für einen deterministischen Ersatz: `presenceInReply` liefert für beide IDs `{ok:false}` (Label „clerk“ ≠ „clerks“/„older man“, „adventurer“ ≠ „stocky man with the crossbow“). Eine reine Prosaerkennung würde hier also ebenfalls scheitern. | Probe 1/3, `probe_keep` (b) **[B]** |
| 4 | **Annahmewissen I73/I74** | `quest.accept` (Engine, I73) gibt Wissen an die anwesende wiry woman. Der erzählte Bearbeiter („The older clerk took it … He stamped the slip“) ist nicht im Zustand und erhält nichts. Zusätzlich wird sein Satz als bedeutsame Erinnerung (imp 7) **der wiry woman** zugeschrieben: `who=["npc.npcnpcwiry_woman"] :: the seal goes READY when the work is done.` Das ist neu gegenüber dem Review: Die Erinnerung geht nicht verloren, sie gerät an die falsche Person. | Probe `probe_i73`, `probe_clerks` **[B]** |
| 5 | **Board-Behauptung** | I72: Crossbowman-Fakt `remark` = „says Vess's crew took the catacombs posting yesterday, so that one is spoken for“. Das Board selbst (Engine-Autorität, `OFFICIAL GUILD OFFERS`) bleibt unberührt. Die Aussage liegt als öffentlicher Fakt vor und kann über `relevant` als Kampagnenwissen erscheinen (Label ohne Sprecherkennzeichnung, context.js L440). Harl Vess' Angebot (I66) ist `promise/open` ohne Personenbindung; Vess hat keine Erinnerungen und ist nicht verortet (`at=null`). | Probe 1/4, Code **[B]** |

**Entscheidung zur Frage „Voraussetzung oder Teil von E2?“:** Die Punkte 1–4 sind **Integritätsvoraussetzung** für jede Wiederbegegnungskarte. Eine Ankunftskarte für eine Sammelperson oder für den falschen Bystander würde den Fehler verstärken. Sie gehören deshalb als **erstes Teilpaket E2-A** in E2, nicht in eine nachträgliche E1-Umdeutung. Die .158-Abnahme bleibt gültig, weil ihre Tests die wörtlich belegten Fälle prüfen. Punkt 5 ist klein und nur Darstellung (Sprecherkennzeichnung) und gehört ebenfalls in E2-A.

### 4.4 Querschnittsbefunde

| ID | Befund | Beleg |
|---|---|---|
| **F6** | Bei GO-Zügen geht der Gesprächspartnerslot an die **verlassene** Person: User01 I61 Marda, User02 I63 Wirtin, User04 I71 Innkeeper. Die Zielpersonen stehen nur als Namens-/Rollen-/ID-Liste in `KNOWN AT`. | Probe 2 **[B]** |
| **F7** | Kompaktkarte nimmt die ersten drei vorhandenen Felder in fester Reihenfolge; `knows` steht zuletzt und fällt bei Personen mit zwei Erinnerungen weg. Der Kopfzeilenschnitt bei 170 Zeichen würde künftige Merkmale (Stimme/Umgang) zuerst abschneiden, weil `traits` davor steht. | Probe 2, Code L861 **[B]** |
| **F10** | Persönlichkeitsdaten fehlen vollständig. Freie NPC-Prädikate statt Record-Prädikaten: `advice`, `greeting`, `remark`, `reminds`, `offer`, `promise`, `says`, `asks`, `warned`, `instructed`, `noticed_alaric`, `armed`, `dinner_response`, `will_tell_marda`. | Probe 4 **[B]** |

| Lauf | Züge | NPCs (benannt) | bedeutsame Erinnerungen (mit NPC) | `attitude`-Events | `promise`-Threads |
|---|---|---|---|---|---|
| User01 | 33 | 6 (5) | 9 (5) | 0 | 0 |
| User02 | 34 | 4 (3) | 4 (1) | 0 | 3 |
| User04 | 38 | 6 (1) | 7 (1) | 0 | 1 |

---

## 5. Funktionierende Mechanismen und Positivkontrollen

- **Keine erfundene Anwesenheit [B]:** `absentKnown` lehnt ab, was die Prosa nicht zeigt; I72 erzeugt keine falsche Anwesenheit, nur eine fehlende. Das Verhalten ist sicher, aber zu streng.
- **Wahrnehmungsgebundenes Wissen [B]:** `witnessEvents` gibt nur Anwesenden Wissen; ein später eintretender NPC erhält kein rückwirkendes Wissen (.158-Test L132).
- **Namens- und Bekanntheitsstufen [B]:** `knows him by name` / `has seen him, does NOT know his name` / `has never seen him` sind in allen Rekonstruktionen korrekt.
- **Kompaktkarte unter Druck [B]:** Bei User04 nie budgetbedingt verworfen (Review 36/36); in allen Rekonstruktionen geliefert.
- **Thread-Lebenszyklus [B]:** offen → erledigt per ID (Tam I54/I58).
- **`KNOWN AT` [B]:** richtige IDs, auf Zielort und Lebende begrenzt, erreicht Erzähler und Extractor.
- **Ereignisquelle [C]:** Swipe, Reload und Replay bleiben stabil, weil alles in den Records liegt (unverändert seit der historischen Analyse).
- **Keine Sympathiepunkte [B]:** 0 `attitude`-Events. Das entspricht Sols Grenze, heißt aber auch: E3 kann nicht auf `attitude` aufbauen und soll es nicht.

---

## 6. Datengrenzen

1. Drei Läufe, 105 Züge, 16 NPCs; nur ein Lauf mit vielen benannten Personen (User01). Absprachen sind selten (4 `promise`-Threads insgesamt).
2. Fold zeigt die **historisch gespeicherten** Events. Spätere Korrekturen (.158 Resolver/Zeuge) wirken nur auf neue Extraktionen; der Extractor wurde **nicht** mit dem aktuellen Prompt neu befragt.
3. `turnBlock`-Rekonstruktionen zeigen, was der **heutige Kontextcode** auf dem historischen Zustand liefern würde. User01/User02 wurden historisch mit älteren Builds erzählt.
4. E0-Tokens sind Engine-Schätzungen, keine vollständigen ST-Requestgrößen (Lore, History, Systemprompt fehlen).
5. Ob das Modell gelieferte Kartenzeilen tatsächlich verwendet, ist nur an der Prosa ablesbar; ein neuer natürlicher Lauf wurde nicht durchgeführt (kein Modellaufruf erlaubt).
6. Wie zuverlässig der Extractor neue strukturierte Felder (`met`, `handled_by`, `who`) füllt, ist **[H]** und nur mit einem natürlichen Test messbar.

---

## 7. Abhängigkeiten E1 → E2 → E3

```
E1 (.158, abgenommen): Kompaktkarte · exakter Resolver · Abschlussnachtrag · E0
        │
        ▼
E2-A Integrität: strukturierte Wiederbegegnung (met) · Bearbeiterzeuge (handled_by)
                 · keine neuen Sammelpersonen · Sprecherkennzeichnung freier NPC-Aussagen
        │   (Ankunftskarten auf falschen Identitäten wären schädlich)
        ▼
E2-B Kontinuität: Ankunftskarten (budgetneutral) · Absprachen mit NPC-Bindung
                 · Kartenreihenfolge · sozialer Teil gemischter Erinnerungen
        │   (Salienz nutzt gebundene Absprachen; technisch auch nach E2-A möglich)
        ▼
E3 Persönlichkeitsanker: manner/interest + voice · Kopfzeile · Salienzschwelle
```

- **PULSE:** `heldThreats` (pulse.js L75) liest nur Bedrohungen aus `scene.present`; durch E2 hinzukommende freundliche NPCs ändern keine Fensterentscheidung **[C]**. PULSE A/C/B braucht kein Redesign.
- **Stealth S1:** Beobachter sind tatsächlich Anwesende. Über `met` eingetragene Personen sind erzählt anwesend und damit zu Recht Beobachter. Ankunftskarten selbst begründen **keine** Anwesenheit. Stealth S2 bleibt unberührt.
- **Kampf:** keine `attitude`-Änderung, `sideOf` bleibt unverändert.

---

## 8. Risiken und Variantenvergleich

| Kriterium | **Variante A** – bestehende Stores erweitern (Entities, Facts, Knowledge, Memories, Threads) + strukturierte Extractorfelder + kompakte Kartenzeilen | **Variante B** – eigener NPC-Beziehungs-/Gedächtnisspeicher (z. B. `npc.bond`-Events, Profil je NPC, eigener Abruf) |
|---|---|---|
| Autorität | eine Wahrheit, vorhandene Firewall | zweite Quelle neben Facts/Threads; Konflikte und doppelte Absprachen (wie heute Fakt + Thread) wahrscheinlicher |
| Replay/Saves | neue optionale Felder, alte Records falten unverändert | neue Eventtypen, Fold-/Validatorarbeit, Altsaves ohne Profil |
| Extractor | wenige neue Felder in bestehenden Shapes | neues Deltaschema, mehr Promptanteil |
| Kontext | Zeilen innerhalb der bestehenden Vier-Felder-Karte | eigener Abschnitt, Budgetdruck steigt |
| Aufwand | M (E2-A) + M (E2-B) + S–M (E3) | L, plus Migration |
| Verbotsgrenzen | erfüllt | verletzt die Vorgabe „keine zweite autoritative NPC-Datenbank“ |

**Empfehlung: Variante A.** Variante B löst keinen belegten Fehler besser: Alle Befunde F1–F10 liegen an Übergängen (Beleg, Bindung, Auswahl), nicht an fehlendem Speicher.

**Kontextbudget (gemessen, Probe 2):** Kompaktkarte ≈ 80–100 Tokens je Person, zwei Personen 159–285. `budgetedTokens` der Rekonstruktionen: User01 I61 1307, I69 1583; User02 I63 1278, I73 2047 (mit `gear_market` 554, `resolved` 622); User04 I71 1465, I72 1578, I73 1418. Pflichtüberlauf entsteht überwiegend aus Gilden-/Markt-/Auflösungstexten, nicht aus NPC-Karten. **Keine pauschale Budgeterhöhung.** E2-B soll den Slot der verlassenen Person durch die Ankunftskarte **ersetzen** (budgetneutral); E3 hält die Kopfzeile bei 170 Zeichen.

**Hauptrisiken:** (1) Der Extractor füllt `met`/`handled_by` zu großzügig → nur IDs aus der angebotenen Liste, Engineprüfung von Ort/Leben/Gildenfunktion. (2) Persönlichkeit aus Einzelreaktion → Schwelle ab zweiter Szene, Ersetzen statt Anhäufen. (3) Absprachen-Inflation (Höflichkeit als Versprechen) → enge Anleitung, Gegenfälle. (4) Regressionen in `stripOwned` → nur Speicher `memory`, nur Abtrennung an Konjunktionsgrenzen, harte Gegenfälle. (5) Replay-Verschiebungen durch Sammelpersonenablehnung → kategorisierte Akzeptanzliste.
