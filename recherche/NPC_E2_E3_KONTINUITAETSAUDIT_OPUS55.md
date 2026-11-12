# Avereth – NPC-E2/E3-Kontinuitätsaudit

**12.11.2026 · Opus 5.5 · nur Code- und Originaldatenanalyse. Keine Tests, keine Simulation, keine Modellläufe, keine Produkt- oder Kanonänderung.**

**Prüfstand:** Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`, Remote-HEAD `59f868e` (Build `.179`), am 12.11. erneut abgefragt. `main` vor diesem Dokument: `cc4630e`. Zeilenangaben beziehen sich auf `59f868e` in `avereth-engine/`.

**Grundlage:**
- Originalarchiv des [Pilot 01](../testrun_10b/npc-20261109-160250Z/originals/) auf `.174`: `avereth-events.json`, `chat.jsonl`, `chat-completions.jsonl` (vollständige Erzähler- und Extractor-Prompts mit Antworten), `calls.json`.
- [Review](../testrun_10b/npc-20261109-160250Z/REVIEW.md) und [Gegenreview](../testrun_10b/npc-20261109-160250Z/GEGENREVIEW_CLAUDE.md) des Piloten.
- Patchnotes `.175`–`.179` in `avereth-engine/docs/`.
- [E2/E3-Fachplan](../patch_plans_10b/NPC_E2_E3_FACHPLAN.md) mit den Regeln R1–R10.
- [D3-Analyse](../testrun_10b/npc-20261109-160250Z/D3_KONTEXTANALYSE_RELEVANT.md).

**Nachweisgrade:**
- **[C]** Code an `59f868e` gelesen.
- **[D]** eigene Auswertung der Pilot-Originale (Python liest JSON, keine Engine). Die Zahlen gelten für `.174`.
- **[Ü]** aus Patchnote oder Review übernommen.
- **[P]** abgeleitet, nicht ausgeführt.

**Zugnummern:** „Z“ ist die Engine-Zugnummer (`turn.begun`). Die bisherigen Reviews zählen „T“ nach `calls.json`. Zuordnung der hier verwendeten Züge: Z23 = T24, Z25 = T26, Z31 = T33, Z40 = T43, Z53 = T58, Z56 = T61, Z58/Z59 = T63/T64.

---

## 0. Kurzurteil

1. **Der E2/E3-Kreislauf ist technisch schlüssig, und seine Schutzregeln wirken.** Beispiele aus dem Pilot:
   - Der Müller wird nicht fälschlich mit Muller verschmolzen.
   - Alaric wird nicht Partei einer Absprache aus Hörensagen.
   - Absprachen behalten nach `.177` ihren Wortlaut.
   - Der einzige Ankerkandidat wird zu Recht abgelehnt.
2. **Die null E3-Anker sind kein Enginefehler. Fehlende Gelegenheit ist aber auch nur die halbe Erklärung.**
   - Für **zwei** NPCs waren die Voraussetzungen erfüllt: Wat Dodd in drei Folgespannen (Z17–Z23) und die Gildenschreiberin in drei Folgespannen (Z25–Z42). Zusammen sind das rund 14 Erzählerzüge.
   - Der Extractor meldete im ganzen Lauf **einen** Kandidaten. Die Hauptursache ist also **fehlende Extraktion**.
   - Der Extractor-Vertrag erwähnt Anker nur in einem Satz der `fact`-Beschreibung. Er nennt keine Längengrenze, und der Katalog markiert nicht, wer schon einmal begegnet ist.
   - Auf `.176+` scheitert der einzige Kandidat an der 80-Zeichen-Grenze, die dem Extractor nicht bekannt ist.
3. **Die größten E2-Kontinuitätsverluste entstehen, weil korrekt arbeitende Teile zusammenspielen:**
   - **Eingefrorenes Schalterwissen:** Auf der Karte der Schreiberin steht bei jedem Besuch (Z23, Z31, Z40) nur der Stand von Z5/Z7. Alle drei Wissenswege scheiterten. Die Originalfälle behebt K4 (`.176`); die natürliche Wirkung ist offen.
   - **Aussagen von NPCs gehen verloren:** Rat, Warnungen und Anrede („the millpond lad“) werden als Fakten mit freiem Prädikat gespeichert. Sie stehen auf keiner Karte und erreichen den Erzähler nur über `relevant`, das im Pilot in 2 von 65 Zügen ankam. Gesehen werden sie also etwa drei Züge lang im Chatverlauf und dann nie wieder.
   - **Bedeutsame gemeinsame Erinnerungen** entstehen nur aus `memory`-Meldungen des Extractors. Die Schreiberin hat in vier Begegnungen eine einzige (Registrierung).
4. **Ein Eingriff in Engine oder Kanon ist vor dem natürlichen Lauf auf `.179` nicht notwendig.**
   - Die Originalfälle der Hauptlücken sind mit `.175`–`.178` behoben, oder ihr Nutzen hängt an natürlichen Daten.
   - Die Auslieferung von NPC-Aussagen ist die bereits entschiedene D3-Option (Teillieferung).
   - **Eine Entscheidung fällt vor dem Lauf an:** Mit dem heutigen Extractor-Vertrag ist E3 im nächsten Lauf wahrscheinlich wieder nicht messbar (§8).

---

## 1. Tatsächlicher Informationsfluss

### 1.1 Vom Narrator in den Zustand [C]

| Information | Extractor-Meldung | Engine-Prüfung | gespeichert als |
|---|---|---|---|
| erste Begegnung | `person.new` (anwesend) | Identität: `keptHere` (`world.js:2149`), `distinct_from`, `collective_person` | `entity.created`, `scene.entered`; die Engine bucht dazu die Erinnerung „first saw {pc}“, Wichtigkeit 4 (`engine.js:844–847`) |
| Wiederbegegnung nach GO | `expected.<go>.met` | `metArrivals`: genau dieser Ankunftsschritt, `KNOWN AT`, Erzählbeleg (`world.js:2089–2112`) | `scene.entered` |
| Wiederbegegnung allgemein | `enter` | `absentKnown` und `presenceInReply` (Erzählbeleg, der die Person identifiziert) | `scene.entered` |
| Schaltervorgang | `expected.desk.handled_by` | `deskHandlers` (`world.js:2127`): Schritt erfolgt, Gildenperson anwesend, Handlungsbeleg (`narration_evidence.js:495–507`) | `knowledge.gained` |
| Alaric gesehen, sein Name | – | `perceiveAll` (`engine.js:835`), `selfIntro` (`:855`) | Wissen `f.pc.appearance`, `f.pc.name` |
| Engine-Tatsache vor Anwesenden | – | `witnessEvents` (`guild.js:35–42`): wer **zum Zeitpunkt der Buchung** anwesend ist | `knowledge.gained` (witnessed) |
| Gildenabgabe bei Ankunft | – | `deskWitnesses` (`world.js:2716`), vergeben in `enterKnown` (`:2051–2060`) nur mit `guildParticipationEvidence` | `knowledge.gained` |
| Gemeinsamer Moment | `memory {text, who, imp 6–10}` | `stripOwned`, `pc_decision`, `trueDeaths` (`world.js:1358–1377`); Zeugen nur Anwesende (`delta.js:647`) | `memory.recorded` (`kind: narrated`) |
| Episode der Eingabe | – | `episode()` (`engine.js:941–951`) | Erinnerung nur mit `who: [pc]`, Wichtigkeit 2–3 |
| Aussage, Rat, Haltung | `fact {s: npc, p: frei, o}` | Identität, Ankerregel, Kampfmoment (`world.js:1305–1342`) | Weltfakt. **Kein Wissen der Person**: Nur geheime Fakten werden ihr eigenes Wissen (`delta.js:548–551`) |
| Wissen einer Person | `learn` | wie im Fachplan | `knowledge.gained` (told/rumor/…) |
| Absprache | `thread {kind: promise/debt, who}` | R7: `pc` nur von Angesicht zu Angesicht (`world.js:1399–1404`); D1: Wortlaut bleibt, fremde Partei wird abgelehnt (`threads.js:151–170`) | `thread.set` mit `who` |
| Name | `person.named` | bekannte Person ohne anderen Namen (`world.js:1192–1205`) | `entity.updated` |
| Anker | `fact {p: voice/manner/interest}` | `anchorRefusal` (`world.js:212–230`) | funktionaler Fakt |
| Aufenthaltsort | – | beim Ortswechsel bleibt die Person am verlassenen Ort (`world.js:2596–2612`) | `entity.at` |
| Anwesenheitsspanne | – | Reducer: `scene.entered` setzt `scene.since`; Verlassen und Ortswechsel löschen es (`state.js:157`, `:167`, `:174`) | abgeleitet |

### 1.2 Vom Zustand zum Narrator [C]

| Block | Priorität | Inhalt |
|---|---|---|
| `npc_compact` (`context.js:699`) | 0 | die zwei wichtigsten Gesprächspartner (`interlocutorScores`, `:933–950`). Kopfzeile mit Rolle, **Ankern** und Aussehen (auf 170 Zeichen gekürzt, Anker vor Aussehen, `:199–201`, `:975`); „toward Alaric“ plus Absprache; zwei der Felder „last meaningful“, „knows“, „also remembers“ |
| `npc_arrival` (`:701`) | 0 | Bekannte am Ziel eines GO (R6), NOT YET SHOWN |
| `present` (`:703`) | 1 | volle Karten weiterer Anwesender; bei den Gesprächspartnern nur Agenda, Geheimnisse, Bindungen. **Fällt bei Budgetüberlauf weg** |
| `npc_continuity` (`:706`, `knowledge.js:239–262`) | 0 | „KNOWN PEOPLE“: **nur benannte** abwesende NPCs (`:248`), die genannt wurden oder hier Geschichte haben; letzter bedeutsamer Moment und einige Fakten |
| `named` | 2 | Karten genannter Abwesender |
| `relevant` (`:825`) | 2 | Abruf aus Fakten, Erinnerungen und Threads; Aussagen mit Sprecher als „X said …“ (R5) |
| Chatverlauf | – | die letzten Antworten im Wortlaut |

**Was davon wiederkommt:**

| Information | auf der Karte? | sonst |
|---|---|---|
| erste Begegnung (Wichtigkeit 4) | nein (unter der Schwelle 6, `knowledge.js:40`) | Grundlage für „has seen him“ und für E3 |
| bedeutsamer Moment (≥ 6) | ja: „last meaningful“, „also remembers“ | KNOWN PEOPLE (nur Benannte), `relevant` |
| Wissen der Person | ja: „knows“ (bis 5) | – |
| Absprache mit Alaric | ja: „between you“ | `relevant` |
| Rolle, Aussehen, Anker | ja: Kopfzeile | – |
| **Aussage, Rat, Haltung (freies Prädikat)** | **nein** | nur `relevant` (Priorität 2) und der Verlauf |
| Aufenthaltsort | – | `KNOWN AT` und `ARRIVING AT` bei einem GO |

---

## 2. Ausgewählte Verläufe im Pilot 01

### 2.1 Die Gildenschreiberin (namenlos, vier Begegnungen) [D]

| Begegnung | Geschehen | gebucht | verloren | ihre Karte danach |
|---|---|---|---|---|
| Z3–Z7 | Registrierung, Annahme der Gnasher-Jagd | Erinnerung „measuring stone … tin member's plate“ (Z5, Wichtigkeit 7); Wissen „Novice“ und „accepted Gnasher“ über `witnessEvents`; Fakten `gave_directions`, `mentioned_widow_hessa` | `handled_by` Z7 („She dipped the quill …“: Pronomen vor jeder Nennung, korrekt abgelehnt) | – |
| Z23 (Abgabe nach GO) | Ankunftskarte geliefert (§2.5); sie erkennt ihn: „The millpond man.“ | – | `met` (zwei Zitate mit „…“), deshalb abwesend → kein `deskWitness`, `desk_handler` abgelehnt, `manner` abgelehnt (`anchor_absent`) | weiter Stand Z7 |
| Z25–Z27 (Warrens-Annahme) | Im Erzählerkontext Z25 stand **keine** Karte („ACTIVE SCENE: nobody besides Alaric“) | Eintritt über `enter`; Fakt „does not break silver“ | `handled_by` („pulled … slip“: Verb fehlte im Wortschatz); keine `memory` | weiter Stand Z7 |
| Z31–Z34 | Rückkehr, Primerkauf, Rat zu Harl | Eintritt über `enter` nach gescheitertem `met`; Fakten `knows_alaric` („calls him 'the millpond lad'“), `refused_pelt`, `advice` | keine `memory` | weiter Stand Z7 |
| Z40–Z42 | Ankunftskarte; sie erkennt „Red“, weiß um Gnasher und Warrens (aus dem Questkontext, nicht von der Karte) | Eintritt | – | **„knows: … accepted contract Cull the Millpond Gnasher“; „last meaningful: [Day 1, 09:25] … tin member's plate“** |

**Befund:**
- Zwischen Z7 und Z40 lernt die Karte nichts. Weder die Abgabe noch die zweite Annahme noch die Anrede „millpond lad“ werden gespeichert.
- Der Erzähler glich das in Z40 selbst aus. Die Karte widerspricht dem aber.
- Auf `.176+` sind die Originalfälle Z23 (Rückkehr gebucht, Wissen über den Abschluss) und Z25 (Verb `pulled` mit Schalterding) laut Patchnote behoben [Ü `PILOT01_176`].
- **Strukturell bleibt:** Bei jeder Schalterhandlung, bei der die Schreiberin erst in der Antwort auftritt, hängt ihr Wissen allein an einem Erzählbeleg (`handled_by` oder `guildParticipationEvidence`). `witnessEvents` bucht zum Zeitpunkt des Spielerzugs, und da ist sie nicht anwesend.

### 2.2 Wat Dodd (Mitfahrt, vier Spannen) [D]

- **Z15:** erste Begegnung.
- **Z16:** Zusage der Mitfahrt (`thread.t16.1`).
- **Z18–Z22:** gemeinsame Fahrt mit Kampf. Bedeutsame Erinnerungen Z21 und Z22.
- **Z23:** Zusage erledigt. Auf seiner Karte steht danach „settled — Wat Dodd drives Alaric on …“. Das zeigt, dass Absprachen den Weg zur Karte schaffen.
- Später erscheint er in KNOWN PEOPLE mit seiner Erinnerung (Erzähler-Prompts der Eingaben 62–64). Bedeutsame Momente tragen also über die Begegnung hinaus.
- **E3:** Als Reisebegleiter beginnt er an jedem Zielort eine neue Spanne (R10/§7, beabsichtigt). Ab Z17 waren Anker zulässig.
- Die Erzählung zeigt wiedererkennbares Verhalten: knappe, trockene Seitenbemerkungen („She likes you“), „Dodd snorted“, „pointed with his chin“. Gemeldet wurde **kein** Merkmal.
- Auf Dodds Karte stand „Wat Dodd name Alaric Red“ als sein Wissen. Das ist ein falscher Namensfakt (B11), mit K8 in `.177` behoben.

### 2.3 Muller (eine lange Spanne, keine Wiederbegegnung) [D]

- **Z42–Z55 im Woolpack:** sieben bedeutsame Erinnerungen, Fakten `mood`, `says`, `debt`, `goblins` und zwei Threads.
- Seine Zusage `thread.t55.1` („say a word for Alaric to Hesse's man“) erscheint in Eingabe 61 auf seiner Kompaktkarte.
- **Mullers Schuld an Hesse** erreicht spätere Erzähler-Prompts nur im Verlauf der Eingaben 59–61, danach nicht mehr. Die bedeutsame Erinnerung von Z53 trägt den Inhalt allerdings weiter.
- **`thread.t34.1`:** Die Kupferzusage war parteilos angelegt, weil Muller beim Hörensagen nicht anwesend war. Auf `.179` würde sie per ID an `[muller, pc]` gebunden und behielte ihren Text (D1) [P]. Weil Muller in Z45 die 4 cp bereits gezahlt hat und keine Erledigung gemeldet wurde, stünde sie als **„open between you“** auf seiner Karte. Die Patchnote `.177` dokumentiert das als Grenze („stimmt aber nur zufällig“). Ob K5a die Erledigung bei Zahlung im Handel auslöst, ist offen.
- **Hof Z58/Z59:** Der Extractor meldet „the miller“ als `enter npc.muller`; die Engine lehnt mit `npc_presence` ab.
  - **Die Ablehnung ist richtig.** Der Müller sagt selbst „Muller said he'd found somebody“. Damit bestätigt sich GPTs Lesart; meine anfängliche Gegenhypothese hielt der Erzählung nicht stand.
  - **Folge:** Der Müller wird nie als eigene Person angelegt. Seine Warnung („they drink at the overflow cut at dusk“), das Brot und sein Beruf fallen über `npc_continuity` weg.
  - Zusätzlich bleibt ein falscher Fakt aus Z57: „npc.miller_boy father: Muller is up at the house“.
  - Muller selbst hatte keine zweite Begegnung, also auch keine E3-Gelegenheit.

### 2.4 Der Woolpack-Fuhrmann (Duplikat) [D][Ü]

`npc.npccarter_woolpack` (Z46) und `npc.carter` (Z56) sind dieselbe Person. Der Name „Torv“ geht in Z56 durch `scene_context` verloren; die Erledigung der Mitfahrt trägt drei Parteien (B6).

**Stand `.179`:** Die Vorgabe K6b soll Duplikate verhindern; ihre natürliche Wirkung ist offen. Den Namensverlust würde O1-B1 aus dem [Fachplan O1/O2](FACHPLAN_O1_O2_KAUSALITAET_UND_TEILBEWEGUNG.md) beheben (dort eingeschränktes GO, erst nach dem Lauf).

### 2.5 Ankunftskarten [D]

R6 arbeitete wie geplant. In den Eingaben 24, 33 und 43 erhielt der Erzähler „ARRIVING AT Adventurers' Guild hall … NOT YET SHOWN“ mit der Karte der Schreiberin. Er zeigte sie erst bei Ankunft und erfand keine Anwesenheit.

---

## 3. E3 im Detail

### 3.1 Voraussetzungen im Code [C]

`anchorRefusal` (`world.js:212–230`) nimmt einen Anker nur an, wenn alle Bedingungen erfüllt sind:
1. Die Person ist jetzt anwesend.
2. Eine gemeinsame Erinnerung mit Alaric liegt **vor** `scene.since[id]`; die Erinnerung „first saw“ genügt.
3. Der Wert hat höchstens 80 Zeichen, nennt nicht Alaric und enthält keinen Engine-Teil.
4. Er ist keine Stimmung ohne Gewohnheitswort.
5. Je Antwort gibt es einen Wert pro Merkmal, je späterer Spanne höchstens eine Änderung.

Ausgewertet wird nur ein `fact` mit `p` gleich `voice`, `manner`, `interest` oder einem Synonym (`knowledge.js:29–32`; `speech`/`speaks` → `voice` über `PRED_SYNONYMS`).

### 3.2 Gelegenheiten im Pilot [D]

| NPC | Spannen (Beginn–Ende) | Anker zulässig ab | Folgespannen |
|---|---|---|---|
| Wat Dodd | 15–17, 17–19, 19–22, 22–23 | Z17 | 3 |
| Schreiberin | 3–8, 25–27, 31–34, 40–42 | Z25 (Z23 nur, wenn `met` gelingt) | 3 |
| Muller, Bedienung Woolpack, Woolpack-Fuhrmann, Hessa, Harl, Tam, Bauer Bren, Geldwechsler, Buchhändler, Müllerjunge, Anwohnerin | je 1 | – | 0 |

### 3.3 Ursachen nach Kategorie

| Kategorie | Befund |
|---|---|
| **fehlende Gelegenheit** | 11 von 13 NPCs mit nur einer Spanne. Muller, der beste Kandidat, kam nie wieder |
| **fehlende Extraktion** | Dodd und die Schreiberin: rund 14 zulässige Erzählerzüge, **kein** Ankerfakt gemeldet. Merkmalsartiges kam unter freien Prädikaten (`mood` bei Muller; `knows_alaric: calls him 'the millpond lad'` bei der Schreiberin) und wird damit weder Anker noch Karteninhalt |
| **abgelehnte Buchung** | ein Kandidat: Z23 `manner` „brisk and unsentimental at the desk, coins counted with a click, back to her ledger without ceremony“. Auf `.174` `anchor_absent`, auf `.176+` `anchor_value`, weil 100 > 80 Zeichen [Ü `PILOT01_176` §5] |
| **nicht ausgelieferter Kontext** | nicht prüfbar, weil kein Anker gespeichert wurde. Codepfad siehe §3.5 |

### 3.4 Warum der Extractor keine Anker meldet [C][D]

- Die einzige Anweisung steht in der `fact`-Beschreibung (`content/deltas.json:296–308`): „voice/manner/interest of a person: only a lasting trait this reply SHOWS …“. Im Prompt mit 37 Meldungsarten ist das ein Satz unter vielen.
- **Keine Längengrenze** im Vertrag, die Engine verlangt aber höchstens 80 Zeichen. Der einzige Kandidat schrieb 100.
- **Kein Zulässigkeitshinweis:** Die Zeile `PRESENT` des Katalogs (`interpret.js:118`) zeigt ID, Handle und Beschreibung. Sie sagt nicht, dass die Person schon einmal begegnet ist und Merkmale jetzt gelten würden. Im Extractor-Prompt für Z20 stand Dodd nur als „Wat Dodd, carter hauling hazel poles …, lean man in a stained canvas coat“.
- **Folge seit `.174`:** Auch `voice` ist ankergebunden. Eine Stimme aus der ersten Begegnung wird nicht mehr gespeichert (D2/D3, beabsichtigt). Im Pilot wurde ohnehin keine gemeldet.

### 3.5 Auslieferung, falls Anker entstehen [C][P]

- **Gesprächspartner:** Anker stehen in der Kopfzeile der Kompaktkarte (Priorität 0, nie verdrängt), vor dem Aussehen.
- **Kürzung:** Die Kopfzeile ist auf 170 Zeichen begrenzt. Die Schreiberin hätte ohne Anker bereits rund 150 Zeichen gebraucht. Ihr Aussehen wird also zuerst gekürzt, ein bis zwei kurze Anker passen. Drei lange Anker (je bis 80 Zeichen) würden den dritten abschneiden (P3 aus dem E3-Kontrollreview).
- **Dritter und weitere Anwesende:** Anker stehen nur in `present` (Priorität 1) und fallen bei Budgetüberlauf weg. Im Pilot war das in 27 Zügen der Fall, nach K3 rechnerisch in 18 [Ü D3].

---

## 4. Bestätigte Schwachstellen und Kontinuitätsverluste

| # | Schwachstelle | Nachweis | Ursache | Stand `.179` | Schwere |
|---|---|---|---|---|---|
| **K1** | Schalterwissen friert ein | Karte der Schreiberin Z23–Z40 [D] | `witnessEvents` bucht vor dem Eintritt; danach hängt alles an einem Erzählbeleg (`handled_by`, `guildParticipationEvidence`, `met`) | Originalfälle mit K4 behoben [Ü]; natürliche Quote offen | mittel |
| **K2** | Aussagen von NPCs kehren nicht wieder | „millpond lad“, Hesse-Schuld, Rat zu Harl: nur in den ~3 Folgezügen im Verlauf, danach in keinem Erzähler-Prompt [D] | R5: Aussagen sind Weltfakten für den Abruf. `relevant` (P2) kam in 2 von 65 Zügen an | unverändert; D3-Teillieferung offen | mittel |
| **K3** | „last meaningful“ veraltet | Schreiberin: Z5 als einziger Moment in vier Begegnungen [D] | Bedeutsame Erinnerungen entstehen nur aus `memory` (≥ 6). Schalteralltag und Episoden (2–3) zählen nicht | unverändert; Design | gering, solange K1 das Wissen trägt |
| **K4** | E3-Extraktionslücke | 1 Kandidat in 63 Extraktionen, 0 in ~14 zulässigen Zügen [D] | Vertrag (§3.4) | unverändert | hoch für die Messbarkeit von E3, gering für die Spielintegrität |
| **K5** | Parteilose Absprachen werden nachträglich gebunden; bezahlte Zusagen bleiben offen | Hessa `t11.1`, Muller `t34.1` [D][C] | D1 prüft nur bei gespeicherten Parteien (`threads.js:158–161`); die Erledigung muss gemeldet werden | dokumentierte Grenze `.177`; K5a natürlich offen | mittel: Die Karte zeigt eine falsche offene Absprache |
| **K6** | Unbenannte bekannte NPCs ohne GO bekommen keine Karte, solange sie im Zustand fehlen | Z25: Schreiberin ohne Karte im Erzählerkontext [D] | `npcContinuity` nur für benannte NPCs (`knowledge.js:248`); `ARRIVING AT` nur bei GO | unverändert | gering: ein Zug, dann `enter` |
| **K7** | Fehlreferenz des Extractors kostet die Informationen der neuen Person | Müller Z58/Z59, Müllerjunge „father: Muller“ [D] | Die Engine schützt die Identität richtig. Die Folgemeldungen hängen an der falschen Referenz | Modellfehler | gering |

**Zusammenwirken (Kernbefund):** Jede Komponente handelt für sich korrekt.
- Die Präsenzprüfung lehnt einen schwachen Beleg ab, die Firewall kein unzulässiges Wissen.
- Der Kontextpacker hält Priorität 0 ein, der Abruf erzeugt die richtigen Einträge.

In der Summe begegnet der Erzähler einer bekannten Person mit einer Karte, die weder ihre letzten Aussagen noch ihre letzten gemeinsamen Vorgänge enthält. Er gleicht das aus Verlauf und Questkontext aus (Z40), solange die Lücke kurz ist.

---

## 5. Ausreichend geschützte Bereiche

| Schutz | Beleg im Pilot |
|---|---|
| **Präsenz und Identität** (`absentKnown`, `presenceInReply`, `keptHere`) | Der Müller wird nicht Muller (Z58/Z59). Ohne diese Ablehnung hätte Muller Wissen und eine Absprache aus einer Szene erhalten, in der er nicht war |
| **R7 Angesicht zu Angesicht** | Hörensagen-Zusage `thread.t34.1` (Muller, Z34) ohne Alaric als Partei |
| **D1 Wortlaut** (`.177`) | Die Hesse-Schuld kann die Kupferzusage nicht mehr überschreiben |
| **R6 Ankunftskarten, NOT YET SHOWN** | keine erfundene Anwesenheit der Schreiberin (§2.5) |
| **Ankerregeln** | Der einzige Kandidat wurde nach Regel abgelehnt (abwesend bzw. zu lang). Keine Stimmung wurde zum Anker (`mood` blieb freier Fakt) |
| **Erinnerungsfirewall** (`stripOwned`, `pc_decision`, `trueDeaths`) | keine Engine-Zustände in Erinnerungen |
| **Bystander ohne Wissen** (R2/D9) | keine Bearbeitung ohne Beleg |
| **K8** | kein Alaric-Name an einem NPC mehr |
| **Absprachen auf der Karte** | Dodd „settled between you“, Muller `t55.1` auf der Kompaktkarte |
| **Bedeutsame Momente über KNOWN PEOPLE** | Dodds Erinnerung kehrt in späteren Zügen zurück |

**Möglicherweise zu streng, ohne Änderung vor neuen Daten:**
- **Der Verbwortschatz für `handled_by`** (`HANDLES`, `HANDLES_WITH_OBJECT`, `narration_evidence.js:223–224`). K4 hat die Originalfälle gelöst; neue natürliche Formulierungen sind wahrscheinlich.
- **Die 80-Zeichen-Grenze bei Ankern** ist sachlich richtig (Kartenkopf 170), dem Extractor aber unbekannt.

---

## 6. Verbesserungsoptionen

| | Option | Nutzen | Risiken | Bewertung |
|---|---|---|---|---|
| **V-1** | **E3-Hinweis im Extractor-Vertrag**, reine Promptänderung aus vorhandenem Zustand: (a) in der `fact`-Beschreibung „short, at most 80 characters“; (b) in `PRESENT` ein kurzer Vermerk „met before: a lasting voice/manner/interest may be recorded“ für Personen, die die R10-Vorbedingung erfüllen (gemeinsame Erinnerung vor `scene.since`). Keine Regeländerung | E3 wird überhaupt messbar; der einzige reale Kandidat wäre gekürzt gültig gewesen | mehr Kandidaten mit Stimmungswerten (`anchor_mood` fängt sie ab), wenige Tokens mehr; eine Vorgabe ändert das Messobjekt | **eingeschränktes GO.** Entscheidung vor oder nach dem Lauf (§8) |
| **V-2** | **D3-Teillieferung von `relevant`** (bereits empfohlene Option) | NPC-Aussagen und ältere Fakten erreichen Wiederbegegnungen (K2) | wie in der D3-Analyse; Spielerzitate nicht pauschal streichen | **GO als bereits geplante, getrennte Option**, kein neuer Mechanismus |
| **V-3** | **Schalterbearbeiter:** Bei einem erfolgreichen Schalterschritt dieser Antwort und genau einer Gildenperson, die an diesem Schalter anwesend oder in der Antwort eingetreten ist, bucht die Engine das Wissen ohne Verbbeleg | K1 strukturell geschlossen | ändert R2/D9 (Bystander); Fehlzuordnung bei mehreren Schreibern | **weitere Daten nötig:** erst die `handled_by`-Quote auf `.179` |

**Nicht empfohlen:**
- Eine neue Gedächtnisschicht.
- Automatische „bedeutsame“ Erinnerungen für Schalterhandlungen.
- Freie Prädikate (`mood`, `knows_alaric`) heuristisch zu Ankern umdeuten (U3).
- Freie NPC-Fakten zusätzlich auf die Karte (Budget; der vorgesehene Weg ist `relevant`).
- Lockerung der Präsenzprüfung (Müller-Fall).
- Automatisches Zusammenführen doppelter Personen (D4).

---

## 7. Fragen, die erst ein natürlicher Lauf auf `.179` beantwortet

| # | Frage | auswertbar aus |
|---|---|---|
| F1 | Wie oft werden `met` und `handled_by` nach K4 angenommen, und wie oft fängt `enter` ein gescheitertes `met` auf? | Ablehnungen `met_evidence`, `desk_handler`, `scene.entered` |
| F2 | Wird das Wissen eines wiederkehrenden Schalters fortgeschrieben (Abschluss, neue Annahme)? | `knowledge.gained` je Gildenperson; Karte im Erzähler-Prompt |
| F3 | Meldet der Extractor in zulässigen Spannen überhaupt Anker, und woran scheitern sie? | Spannen wie §3.2; Regeln `anchor_*` |
| F4 | Erledigt K5a bezahlte Zusagen im Handel, und legt der Extractor andere Sachen derselben Person neu an? | `thread.set` (`resolved`), offene „between you“-Zeilen |
| F5 | Entstehen weiter Personenduplikate (K6b)? | gleiche Rolle und Szene, zwei IDs |
| F6 | Erreichen Aussagen und Fakten früherer Begegnungen den Erzähler (nach K3, ohne D3)? | Suche der Aussage in späteren Erzähler-Prompts, wie in §4 K2 |
| F7 | Nutzt der Erzähler gespeicherte Anker, falls es welche gibt? | Erzählerantwort gegen den Kartenkopf |
| F8 | Wie oft sind unbenannte Bekannte ohne Karte im Bild (K6)? | Eintritt einer bekannten ID ohne Karte im Vorzug |

Alle Fragen lassen sich mit derselben lesenden Auswertung beantworten wie in diesem Audit (Events plus vollständige Prompts aus `chat-completions.jsonl`), ohne neuen Runnercode.

**Voraussetzung im Lauf:** Wiederbegegnungen mit bereits bekannten Personen. Im Pilot gab es sie nur bei einem Reisebegleiter und am Gildenschalter.

---

## 8. Empfehlung: Eingriff vor dem Lauf?

**Notwendig ist kein Eingriff.**
- K1 ist für die Originalfälle behoben.
- K2 hat mit D3 einen geplanten Weg.
- K3, K6 und K7 sind gering oder Modellfehler.
- K5 ist eine dokumentierte, bewusste Grenze.
- Engine und Kanon bleiben vor dem Lauf unverändert.

**Eine Entscheidung fällt vor dem Lauf an, und zwar wegen E3:**
- **Ohne V-1** misst der Lauf E2 sauber auf `.179`. E3 wird aber mit hoher Wahrscheinlichkeit wieder ohne Anker enden (Pilot: 0 von ~14 zulässigen Zügen). Dann bleibt offen, ob E3 funktioniert.
- **Mit V-1** (zwei Sätze im Vertrag, kein Engine-Code) wird E3 messbar. Der Lauf misst dann aber nicht mehr exakt den Extractor von `.179`. E2 bleibt dabei unberührt, weil sich nur die `fact`-Beschreibung und der `PRESENT`-Vermerk ändern.

**Meine Empfehlung:** den Lauf auf unverändertem `.179` durchführen, wie es die bisherige Reihenfolge vorsieht, und dabei F3 anhand der Spannen ausdrücklich auswerten. Zeigt er erneut zulässige Spannen ohne gemeldete Anker, ist V-1 der belegte, kleinste nächste Schritt. Wer E3 schon in diesem Lauf bewerten will, sollte V-1 vorher entscheiden. Das ist eine Nutzerentscheidung, kein technischer Zwang.

**Nicht vor dem Lauf:** V-2 (D3), V-3, O1-B1. Neue Heuristiken oder Gedächtnisstrukturen auch danach nur bei konkretem Befund.

---

## 9. Unabhängiger GPT-Gegenreview

**12.11.2026 · Nur unabhängiger Code- und Fachreview, keine Tests, keine Implementierung oder Kanonänderung.**

**Prüfgrundlage:** Opus-Audit §§0–8 dieser Datei; [Pilot-01-Review](../testrun_10b/npc-20261109-160250Z/REVIEW.md), [Gegenreview](../testrun_10b/npc-20261109-160250Z/GEGENREVIEW_CLAUDE.md), [D3-Kontextanalyse](../testrun_10b/npc-20261109-160250Z/D3_KONTEXTANALYSE_RELEVANT.md), [NPC-Fachplan](../patch_plans_10b/NPC_E2_E3_FACHPLAN.md), [Patchnote .176](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/59f868eaf3c4ed7942ddc42ba3d180fab44a72cd/avereth-engine/docs/PILOT01_176_CONTEXT_EVIDENCE.md).

**Eigenständig am Produktcode .179 geprüft:** `src/v4/world.js` (`anchorRefusal`, `metArrivals`, `deskHandlers`, `fact`, `thread`), `src/knowledge.js` (Ankerprädikate, bedeutsame Erinnerungen, `npcContinuity`), `src/context.js` (Kompakt-/Ankunftskarten, `relevant`, P0), `src/engine.js` (erste Begegnung), `src/state.js` (Präsenzspanne), `src/v4/interpret.js` und `content/deltas.json` (Extractor-Vertrag) sowie `src/threads.js` (Parteien/IDs). Opus' Zahlen aus dem ursprünglichen Pilot auf `.174` wurden **nicht unabhängig erneut aus allen Originalantworten gezählt**. Keine Node-, Replay-, ST-, Modell- oder Fold-Ausführung.

### 9.1 Gesamturteil

**Opus' Hauptdiagnose ist überzeugend:** Der Informationsweg von erzählter Begegnung zu gespeichertem NPC-Merkmal und späterer Wiederverwendung ist durch mehrere voneinander getrennte Filter begrenzt. Der Befund „keine E3-Anker“ ist **kein Beleg eines fehlerhaften Ankerreducers**. Er ist aber bei vorhandenen späteren Begegnungen und wiedererkennbarer erzählter Eigenart **ein ernst zu nehmender Wirksamkeitsbefund für Extraktion und Vertrag**.

Die vorhandenen Guards zu tatsächlicher Anwesenheit, Erst-/Wiederbegegnung, individueller Identität und Absprachen sollten **nicht pauschal gelockert** werden. Ein neuer generischer NPC-Speicher, automatisches Erinnern sämtlicher Schalterhandlungen und globale NPC-Identitätsfusion sind nicht begründet.

### 9.2 E3: Berechtigung, Bericht und Auslieferung auseinanderhalten

1. **Berechtigung:** `anchorRefusal` verlangt tatsächliche Präsenz sowie eine frühere gemeinsame Erinnerung mit Alaric, deren `turn` **vor** dem `scene.since` der laufenden Präsenzspanne liegt. Die automatische Erinnerung `first saw {pc}` aus `perceiveAll` hat Wichtigkeit **4**: Sie genügt für diese Berechtigung, obwohl sie die Wichtigkeitsschwelle **6** für einen bedeutsamen Kartenmoment nicht erreicht. Das ist konsistent, nicht widersprüchlich.
2. **Bericht:** E3 erfordert einen tatsächlich gemeldeten passenden `fact`-Eintrag, also z. B. `voice`, `manner` oder `interest`. Die Engine erfindet Anker nicht aus sonstiger Prosa. Die einzige Ankerbeschreibung in `content/deltas.json` nennt die Validatorgrenze von **maximal 80 Zeichen nicht**. Auch der `PRESENT`-Katalog signalisiert eine zulässige spätere Begegnung derzeit nicht. Opus' 14 berechtigte Pilotzüge und nur ein Kandidat sind aus dem historischen Originalmaterial gezählte Indizien für die Vertragslücke, keine neue `.179`-Messung.
3. **Konkret bestätigter Fall:** Die Produktpatchnote zu `.176` dokumentiert, dass der einzige damalige Ankerkandidat nach erfolgreicher Präsenzkorrektur statt `anchor_absent` wegen **100 statt maximal 80 Zeichen** als `anchor_value` scheitert. Den Wert einfach automatisch abzuschneiden wäre keine gute Lösung: Bei Persönlichkeit zählen Bedeutung und Textbeleg.
4. **Auslieferung:** `npc_compact` und `npc_arrival` haben Priorität 0; die Anker erscheinen vor dem Aussehen im Kartenkopf. **Aber:** Der Kopf ist auf **170 Zeichen** begrenzt. Drei Merkmale mit je 80 Zeichen passen nicht unbedingt hinein. Für weitere Anwesende kann die ausführliche P1-Karte aus Budgetgründen fehlen. Die spätere Verwendung durch den Erzähler muss daher mit tatsächlichem Prompt und Antwort separat gemessen werden.

**V-1 (kleine Extractor-Vertragskorrektur): eingeschränkt sinnvoll.** Der Vertrag sollte die 80-Zeichen-Grenze nennen. Ein dynamischer Hinweis „spätere Begegnung, Merkmal zulässig“ darf nur dann gesetzt werden, wenn die Engine die **wirkliche R10-Voraussetzung** kennt (jetzt anwesend und gemeinsame Erinnerung vor `scene.since`); ein bloßes „bekannte Person“ wäre zu ungenau. Eine solche Markierung ist ein Katalog-/Prompt-Eingriff, **keine neue Berechtigung, keine automatische Eigenschaft und keine Änderung des Ankerreducers**. Gegenfälle: Stimmung statt Gewohnheit, erste Begegnung, abwesender NPC, Aussage nur durch Alaric, zu langes Merkmal.

### 9.3 NPC-Aussagen, Wissen, Karten und D3

Opus' zentrale Unterscheidung ist korrekt: Ein gespeicherter Weltfakt ist **nicht automatisch das Wissen des NPC** und auch **nicht automatisch seine bedeutsame episodische Erinnerung**. `npcCard` zeigt spezifische Kenntnis-/Erinnerungszeilen und Absprachen; der Abruf `relevant` enthält darüber hinaus freie Fakten. Das dient den Wissensgrenzen.

**Präzisierung:** „Freie NPC-Aussagen erscheinen nur in `relevant`“ ist als pauschaler Satz zu stark. **Harte** etablierte Fakten zu anwesenden oder benannten Subjekten können über den separaten P0-Abschnitt `facts` kommen; als echte gemeinsame `memory` dokumentierte Aussagen können über Karten/`npcContinuity` wieder erscheinen. Für die **konkret von Opus ausgewerteten gewöhnlichen freien Aussagen** gilt der Kritikpunkt jedoch: Ohne zusätzliche `memory`-/`learn`-Buchung hängen sie weitgehend an vergangenem Chat und `relevant`.

Die D3-Teilauslieferung ist deshalb **eine plausible Verbesserung, keine garantierte Wiederherstellung jeder fehlenden Aussage**. Sie liefert nur die nach Rang und Restbudget passenden ersten Einträge. Vorher/Nachher muss am selben Pilotkorpus insbesondere bei konkreten Rückkehrzügen und später natürlich geprüft werden. Spielerzitate nicht pauschal entfernen: Eine früher gesprochene Zusage kann gerade die wichtige NPC-Kontinuität tragen.

Die historisch eingefrorene Karte der Schreiberin ist belegt; `.176` K4 hat die ursprünglichen Evidenz- und Schalterverb-Fälle gezielt behoben (Sol meldet Regressionen/Host-Smokes). Ob dieselbe Buchung bei **neuen freien Formulierungen** gelingt, ist noch offen. Aus bloßer Anwesenheit sollte kein automatisches `handled_by` werden: Ein Schalterbearbeiter ist nicht jeder Umstehende.

### 9.4 Parteilose Absprachen und falsche Müllerreferenz

Die Codewarnung ist begründet: `world.js` lässt den PC als `thread.who` bei `promise`/`debt` nur eintragen, wenn ein NPC-Partner anwesend ist. `threadEvents` erlaubt bei einer späteren Meldung mit derselben ID zusätzliche Parteien; der Schutz gegen eine **fremde Partei** greift nur, wenn zuvor schon andere NPC-Parteien gespeichert waren. Ein parteiloser Thread kann daher später persönliche Parteien erhalten, und eine offene „between you“-Zeile wäre dann möglich. **Aber:** Ob die konkrete Kupferzusage von Muller bei Verarbeitung des alten Pilotmaterials auf `.179` tatsächlich so im Karteikontext steht, bleibt eine **Prognose**, kein neu ausgeführter Replay- oder ST-Nachweis. Nicht automatisch einen weiteren Settlement- oder Identitätsmechanismus hinzufügen.

Der Müller am Hof ist nach Opus' Textabgleich **nicht** Muller: Der Erzähler lässt ihn ausdrücklich von Muller als Drittem sprechen. Die Ablehnung der fälschlichen `enter npc.muller`-Referenz war daher richtig. Die verloren gegangenen Folgeinformationen sind primär ein Extractor-Identitätsfehler, **kein Argument zur Lockerung des Präsenzguards**.

### 9.5 Entscheidung vor dem nächsten natürlichen Lauf

**GPT-Empfehlung:** Den vereinbarten natürlichen NPC-/PULSE-Lauf **zunächst auf unverändertem `.179`** durchführen. Das ist der klarste Nachweis für die Wirkung der Korrekturbuilds `.175` bis `.179`. Für E3 gilt dann ausdrücklich: keine Anker heißt **nicht bestanden und nicht widerlegt**, sondern die Berichts- und Gelegenheitskette muss separat beurteilt werden.

Wer in *diesem* nächsten Run unbedingt die **E3-Extraktionsverbesserung** messen will, kann alternativ V-1 vorher als **eigenständigen, versionierten Mini-Patch** freigeben. Dann testet der natürliche Lauf jedoch eine neue Version und nicht mehr den unveränderten Stand `.179`. Bei E3-Vertragsänderung nicht gleichzeitig D3, Präsenz- und Absprachenregeln verändern; sonst bleibt die Ursache eines Erfolgs unklar.

**Für die Run-Auswertung getrennt festhalten:**

| Ebene | Nachweis |
|---|---|
| E2 Rückkehr | tatsächliches `met`/`enter`, `met_evidence`-Ablehnungen, korrekter NPC und tatsächliche Präsenz |
| E2 Schalter | wirklich bearbeitete Schritte, `handled_by`-Beleg und `knowledge.gained` beim richtigen NPC |
| E2 Absprachen | `thread.set`-Partei, Text, offen/erledigt, Beleg von Zahlung/Erfüllung; keine nur behauptete Erledigung |
| E3 Gelegenheit | frühere gemeinsame Erinnerung und spätere getrennte Präsenzspanne |
| E3 Bericht | gemeldete `fact`-Kandidaten, Synonyme und `anchor_*`-Ablehnungen |
| E3 Persistenz | angenommener Fakt nach Save/Reload unverändert |
| E3 Auslieferung | konkreter `npc_compact`-/`npc_arrival`-Kartenkopf und tatsächliche Verwendung im Narrator |
| D3 | konkrete zurückgelieferte Einträge je Rückkehrzug, nicht nur 2/65-Quote |
| PULSE | Fenster, echte Zwischenereignisse, Rast und Dungeon separat; NPC-Messung ersetzt keinen PULSE-Review |

**Wenn zulässige spätere Begegnungen erneut ohne Ankerkandidaten bleiben:** V-1 als kleinsten nächsten Fachpatch priorisieren; erst bei nachweislich gespeicherten, aber **nicht angezeigten/verwendeten** Ankern die Karten-/Kontextseite verändern. Wenn Schalterwissen und Threads im aktuellen freien Spiel korrekt sind, keine vorsorglichen zusätzlichen Guards.

**Abschluss:** Der stärkste neue Befund ist eine **unterinformierte Extraktion von E3-Merkmalen trotz existierender Engine-Berechtigungsprüfung**. Die Architektur des NPC-Gedächtnisses bleibt als Grundlage tragfähig; neue Architekturmodule sind nach der vorliegenden Evidenz nicht gerechtfertigt.
