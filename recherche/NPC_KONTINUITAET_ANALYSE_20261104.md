# NPC-Kontinuität und lebendige Charaktere – Analyse und Roadmap-Bewertung

**Stand 04.11.2026 · nur Analyse und Bewertung, keine Implementierung, keine Patchplanung auf Codeebene.**
Grundlage: main `b2682a5`, Produkt **.155 / [62672d8](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/62672d875ad02204c06d9b9f76425f1127572ad7)**,
der persönliche [User-Testrun 01](../testrun_10b/user-20261104-162404/README.md), der vollständige Serverlog des Laufs,
[Designkanon](../02_DESIGN_KANON.md) und [Roadmap-Entwurf](../07_ROADMAP_NACH_10B_ENTWURF.md).

**Kennzeichnung:**
- **[B] bestätigt:** durch Originaldaten, Serverlog oder Code belegt.
- **[H] Hypothese:** plausibel, aber nicht bewiesen.
- **[E] offene Designentscheidung:** liegt beim Nutzer.

Codeverweise beziehen sich auf .155 und sind relativ zu `avereth-engine/`.

## 0. Kurzfassung

1. **Brenna hat nicht „vergessen“, die Erinnerung wurde nicht geliefert. [B]** Nach I66 war ihre Erinnerung
   gespeichert (Wichtigkeit 6: „put off his dinner invitation until he has more lines in her ledger“), und sie kannte
   Alarics Namen. Im Erzähler-Request für I70 fehlte trotzdem ihre gesamte NPC-Karte: Der Kontextaufbau verwarf sie
   wegen des Budgets von 1400 Tokens. Das Gespräch aus I65/I66 stand noch im Chatverlauf, das Modell ignorierte es
   trotzdem.
2. **Das ist kein Einzelfall. [B]** In diesem Lauf fiel die Karte anwesender NPCs in **7 von 17** Zügen mit
   anwesenden NPCs weg, gehäuft bei Gildenboard, Annahme und Abgabe. Der Erinnerungsabruf `RELEVANT` fiel in
   **26 von 31** Zügen weg. Ursache ist die Packreihenfolge: Pflicht-Textbausteine der Gilde und Quest haben die höchste
   Priorität 0, die Karte des Gesprächspartners nur Priorität 1, und alle anwesenden NPCs stehen als Block in einem
   einzigen Abschnitt.
3. **Brennas falsche Aussage zum Dungeonauftrag (I62) hat drei belegte Teilursachen:**
   - Die enginegebuchte Abgabe gab der Schreiberin kein Wissen davon, weil sie die Szene erst nach dem Abschlussfakt
     betrat.
   - Beim Weg zur Gildenhalle lieferte die Engine nur Brennas Namen, keine Karte und keine Erinnerung.
   - Der Erzähler übersah den einzigen Hinweis, einen anonymen Listeneintrag „[completed]“.
4. **Die Beziehungsebene ist gebaut, wird aber nicht befüllt. [B]** In 31 Extraktionen gab es kein einziges
   `attitude`-Delta. Brenna steht nach Flirt und Dinner-Einladung weiter auf „no established attitude“. Persönlichkeit
   und Temperament haben keinen festen Platz; `voice` und `agenda` wurden für keinen NPC gesetzt.
5. **Zwei Datenfehler im Speicherpfad: [B]**
   - Freitext-Fakten mit einem Personennamen werden zur Entitäts-ID umgeschrieben; bei I66 ging so der Inhalt zweier
     Sozialfakten verloren.
   - Die vom Spieler gesetzte Verabredung (I55: „ask me tomorrow …“) wurde weder als Erinnerung noch als Thread
     gespeichert.
6. **Was funktioniert, wenn die Karte ankommt: [B]**
   - Identität und Namen bleiben über den ganzen Lauf stabil.
   - Wissensgrenzen halten: Doran kennt den Namen nicht.
   - Recall gelingt: I64 korrigiert den Questirrtum anhand der Karte, I66 erinnert die Inn-Empfehlung.
7. **Die Roadmap-Reihenfolge stimmt grundsätzlich, aber Schritt 1 ist ein Kontextproblem, kein Speicherproblem.**
   Davor fehlt eine kleine Diagnose- und Budget-Etappe. Ein knapper Persönlichkeitsanker gehört früher als
   „Beziehungen“. Die Auswahl wichtiger NPCs ist eine Querschnittsaufgabe.
8. **Schnelle, risikoarme Verbesserungen sind mit vorhandenen Mechaniken möglich**, ohne neue Speicherbank,
   zusätzlichen Modellaufruf oder neue Simulation. Größere Arbeiten (Beziehungsverlauf, Bogen-Gedächtnis,
   Eigenleben/PULSE) sollten erst nach persönlichen Tests der kleinen Etappen beginnen.

## 1. Methode und Belegbasis

- **Daten:**
  - [Originalchat](../testrun_10b/user-20261104-162404/originals/chat.jsonl) mit den eingebetteten Engine-Records
    jeder Nachricht.
  - [Eventexport](../testrun_10b/user-20261104-162404/originals/events.json).
  - [Userfeedback](../testrun_10b/user-20261104-162404/originals/Userfeedback%20Spielgef%C3%BChl.txt).
  - Der Serverlog `ST_2026-11-04_16-24-04.txt`: UTF-16, 12 004 086 Byte, SHA-256 `fe43106b…ac73b`, identisch mit dem
    [Quellenmanifest](../testrun_10b/user-20261104-162404/SOURCE_MANIFEST.md); nicht im Git.
- **Serverlog:** Alle 102 Modellaufrufe wurden aus dem Node-Objektdruck rekonstruiert und über ihren Antworttext den
  Chatnachrichten zugeordnet. Maßgeblich sind die Erzähler-Requests **#82 (I62), #85 (I64), #88 (I66) und #95 (I70)**.
- **Rekonstruktion des Engine-Blocks:** `host.turnBlock()` des .155-Codes, angewendet auf die gespeicherten Records.
  Das erzeugt für I65 und I69 genau die Abschnittsmengen der geloggten Requests #88 und #95; die Methode ist also für
  diesen Lauf gültig. Derselbe Aufruf mit größerem Budget zeigt, was ohne Kürzung geliefert worden wäre.
- **Nicht gemacht:** keine neuen Modellaufrufe, kein Nachspielen mit anderem Budget im echten Modell, keine Testsuite,
  keine Produktänderung. Aussagen darüber, wie sich das Modell mit vollständiger Karte verhalten hätte, sind
  Hypothesen.

## 2. Ist-Analyse des NPC-Systems

### 2.1 Was gespeichert, ausgewählt und geliefert wird

| Schicht | Speicherung | Auswahl für den Erzähler | Stand im Lauf |
|---|---|---|---|
| **Identität** | Entität mit fester ID; `person.new`/`person.named`/`enter`; Namensschutz in `world.js` | Szenenhandle in der Karte, `KNOWN AT` bei Reisezielen, `KNOWN PEOPLE` für Abwesende | **[B] stabil:** Brenna ist von I6 bis I70 `npc.npcglassmere_clerk`, Doran ebenso |
| **Rolle/Aussehen** | `traits` aus der Einführung, Fakten `occupation`/`appearance`/`voice`/`agenda` (`context.js:125` `npcCues`) | Kopfzeile der Karte | **[B]** nur Rolle und Erstbeschreibung; `voice`/`agenda` nie gesetzt |
| **Persönlichkeit/Temperament** | **kein eigenes Feld** | nur indirekt über `traits` | **[B] Lücke** |
| **Wissen über Alaric** | `knowledge` je NPC mit Quelle und Stance (witnessed/told/…); Identitätsstufe Name/gesehen/unbekannt | `knows:`-Zeile, „knows him by name“ | **[B] korrekt** (Brenna kennt den Namen seit I8), aber Lücke bei der Abgabe, siehe §3.3 |
| **Erinnerungen** | `memory.recorded`: Erstbegegnung (Wichtigkeit 4), Episode der Spielerworte (2–3, als Alarics Erinnerung), erzählte Erinnerung aus dem Extractor (meist 6) | Karte: **eine** „last meaningful“ (≥ 6), dazu höchstens zwei „also remembers“ bei Wortüberschneidung (`context.js:142`); `RELEVANT`-Abruf | **[B] Speicherung gut** (zwei Brenna-Erinnerungen mit Wichtigkeit 6), Lieferung schwach (§2.2) |
| **Beziehung** | `relations[rel.<id>.attitude.pc]` als Zahl mit `why`, nur aus dem `attitude`-Delta; Beziehungsfakten als „ties“ | Zeile „toward Alaric“ | **[B] ungenutzt:** 0 `attitude`-Deltas in 31 Extraktionen |
| **Offene Absprachen** | Threads `promise`/`debt`; Agenda-Fakt | Threads im Kontext; Agenda auf der Karte | **[B]** keine einzige soziale Absprache als Thread; die 4 Threads des Laufs sind Gefahren und Zeichen |
| **Chatverlauf** | – | die letzten 4 Spielerzüge mit Antworten (`host.js:560`, `historyTurns: 4`) | **[B]** I70 sah I63–I69, also auch das Flirtgespräch |
| **Erzählervertrag** | statisch, rund 36 000 Zeichen | – | Abschnitt „NPC CONTINUITY“, „World indifference“ („A stranger is normally treated as a stranger…“), Wissensgrenzen |

### 2.2 Wie der Engine-Block gepackt wird – die zentrale technische Schwäche

`buildContext()` hat ein Standardbudget von **1400 Tokens** (`context.js:32`; in den ST-Einstellungen änderbar,
`index.js:30`). Gepackt wird so (`context.js:770`):

- Priorität 0 wird immer genommen und belegt das Budget.
- Priorität 1 und höher kommt nur dazu, wenn noch Platz ist.

| Abschnitt | Priorität | Größe bei I69 (Tokens) |
|---|---|---:|
| Gildenliste `OFFICIAL GUILD OFFERS` (inkl. bis zu 5 erledigter/abgelaufener) | 0 | 306 |
| `ACTIVE QUEST MEMORY` (weitgehend fester Text) | 0 | 368 |
| `PLAYER ACTIONS` (Annahme-Textbaustein) | 0 | 226 |
| `KNOWN PEOPLE` (Abwesende) | 0 | – |
| **`ACTIVE SCENE` (alle Karten anwesender NPCs als ein Block)** | **1** | **292 → verworfen** |
| `SETTLEMENT LIFE` | 1 | 34 → aufgenommen |
| `RELEVANT` (abgerufene Erinnerungen) | 2 | verworfen |

**Befunde:**
- **[B] Prioritätsumkehr:** Abwesende Bekannte (`KNOWN PEOPLE`, Priorität 0) sind sicherer im Prompt als der
  NPC, mit dem Alaric gerade spricht.
- **[B] Alles oder nichts:** Doran und Brenna teilen sich einen Abschnitt; passt der Block nicht, fehlen beide. Der
  kleinere `SETTLEMENT`-Abschnitt rutscht dann nach.
- **[B] Wegfallquote über den ganzen Lauf:**
  - `ACTIVE SCENE` fehlte in 7 von 17 Zügen mit anwesenden NPCs (I13, I15, I17, I57, I67, I69, I71).
  - `RELEVANT` fehlte in 26 von 31 Zügen.
  - Das Recherchedokument vom 28.10. nennt für `RELEVANT` noch „25 % des Kontextbudgets“. Praktisch kommt der Abruf
    heute fast nie beim Erzähler an.
- **[B] Doppelte Pfade:** Bei I61 erscheint Tilly zugleich in `KNOWN PEOPLE` und in `NAMED, NOT PRESENT`. Mehrere
  Erinnerungspfade (Karte, `KNOWN PEOPLE`, `NAMED NOT PRESENT`, `KNOWN AT`, `RELEVANT`) überschneiden sich und haben
  verschiedene Prioritäten. Das ist unnötige Komplexität.
- **[B] Wenig Inhalt im Abruf:** Ohne Kürzung bestünde `RELEVANT` bei I69 überwiegend aus toten Käfern, Raumfakten
  und Spielerzitaten. Die beiden Brenna-Sozialfakten erscheinen dort beschädigt als „Brenna dinner response Brenna“
  (§2.3).

**Größenordnung:** Der Erzähler-Prompt hat im Median **11 602** Prompt-Tokens, davon rund 9 400 gecacht (statischer
Teil). Der Engine-Block mit rund 1 500 Tokens liegt im ungecachten Rest. Bei gemeldeten Gesamtkosten von rund 0,13 (Providerangabe) für
den ganzen Lauf kosten 200–400 zusätzliche Tokens für garantierte NPC-Kontinuität fast nichts. Die Frage ist nicht das
Budget, sondern die Reihenfolge.

### 2.3 Datenfehler im Speicherpfad

1. **[B] Faktobjekt durch Personen-ID ersetzt.**
   - Der Extractor lieferte bei I66 `dinner_response`: „Brenna puts off Alaric's dinner invitation: ask again when he
     has more lines in her ledger“ und `will_tell_marda`: „…“.
   - Gespeichert wurde jeweils `o: "npc.npcglassmere_clerk"`. Ursache: `case 'fact'` schickt auch das Objekt durch
     `mapRef()` → `idOf()` (`v4/world.js:383, 1163`), und Freitext mit Personennamen wird als Referenz aufgelöst.
   - Die genaue Treffregel des Resolvers habe ich nicht separat nachgestellt; Ergebnis und Codepfad sind belegt.
2. **[B] Abgabe ohne Wissen der Schreiberin.**
   - `acceptContract` und `completeContract` zeichnen beide einen Fakt auf (`v4/guild.js:157` bzw. `completed_contract`).
   - Wissen erhält nur, wer in diesem Moment anwesend ist. Bei I13 war Brenna anwesend und weiß seitdem von der
     Annahme.
   - Bei I52 laufen Ankunft und Abgabe in einer Nachricht: `scene.moved` setzt die Anwesenheit zurück (Event 2),
     der Abschlussfakt folgt als Event 9, Brenna betritt die Szene erst als Event 11.
   - Ihre Karte kennt deshalb nur „accepted“, nie „completed“.
3. **[B] Spielerseitige Verabredung nicht erfasst.** Der Satz von I55 („you better ask me then if Marda was friendlier“)
   und der Aufschub der Einladung in I66 wurden nicht als `promise`-Thread angelegt. Der Aufschub existiert nur im
   Erinnerungstext.
4. **[B] Falsche Aussage als Fakt gespeichert.** Brennas Irrtum aus I62 („still showing active“) liegt als
   öffentlicher Fakt `says` vor und erschien später im Abruf. Der Fakt ist formal richtig (sie hat es gesagt), kann den
   Fehler aber weitertragen.
5. **[H] Erster Eindruck als Dauermerkmal.** Brennas `traits` lauten dauerhaft „…gave Alaric the measuring look the
   counter gives everyone new“. Die Karte zeigt diesen Erstkontakt bei jeder Begegnung als Beschreibung. Dass das die
   Distanz in späteren Szenen fördert, ist nicht belegt; die Formulierung ist aber ungünstig.

### 2.4 Was bereits gut funktioniert [B]

- **Identität und Namen:** Brenna bleibt eine Person. Ihr Name wird bei I54 diegetisch gelernt. `KNOWN AT` nennt bei
  Reisen die bekannten Leute des Ziels.
- **Wissensgrenzen:** Doran „does NOT know his name“ und spricht von „the stranger“. Geheimes und Beobachtetes wird
  getrennt.
- **Erinnern, wenn die Karte da ist:**
  - Bei I64 lag die Karte vor („noted the Grotto cleared and sixty copper paid out“), und Brenna korrigiert sich über
    das Ledger.
  - Bei I66 lag sie vor, und Brenna antwortet auf „remember what you told me yesterday?“ mit der Inn-Empfehlung.
  - In beiden geprüften Fällen nutzte das Modell vorhandene Kartenzeilen.
- **Extraktion bedeutsamer Momente:** Beide sozialen Kernszenen wurden mit Wichtigkeit 6 gespeichert.
- **Persistenz:** Alles sind Events in den Nachrichten-Records. Swipe, Reload und Replay bleiben damit stabil, ohne
  zweite Datenbank.

## 3. Brenna – I52 bis I70 im Einzelnen

### 3.1 Zeitlinie

| I | Geschehen | gespeichert | im Prompt des nächsten Erzählers | Verwendung |
|---|---|---|---|---|
| I8 | „hello my name is alaric Red“ | `knowledge` Name, told | – | – |
| I52 | Abgabe Glimmerdeep, 60 cp | Quest completed, Fakt `completed_contract`; **kein Wissen für Brenna** (§2.3 Nr. 2) | – | korrekt erzählt |
| I54 | Name Brenna, Inn-Empfehlung | Erinnerung 6 „recommended the Drowned Lantern … noted the Grotto cleared and sixty copper paid out“ | – | – |
| I55 | Spieler: „ask me tomorrow if Marda was friendlier“ | **nichts** | – | – |
| I62 | nächster Morgen, Gang zur Gilde | Fakt `says` „still showing active“ | **#82:** Szene noch im Gasthaus, **keine Brenna-Karte**; nur `KNOWN AT … Brenna, Guild clerk`; Gildenliste „Clear Glimmerdeep Grotto Level 1 [completed]“ ohne Bezug zu Alaric; die Abgabe (I52/I54) liegt **außerhalb** des Chatfensters | **falsch:** „still showing active under your name“ |
| I64 | Spieler weist darauf hin | – | **#85:** Karte mit „last meaningful … sixty copper paid out“ | **richtig:** sie korrigiert sich über das Ledger |
| I66 | Flirt, Dinner-Einladung, „remember what you told me?“ | Erinnerung 6 „put off his dinner invitation until he has more lines in her ledger“; zwei Sozialfakten **beschädigt** | **#88:** Karte vorhanden | **richtig und persönlich:** „I don't dine with men whose names I've only written once. Ask me again…“ |
| I68 | Board lesen | – | Karte verworfen (I67) | Erzählung ohne Brenna |
| I70 | Auftrag bei Brenna registrieren | – | **#95: keine Karte, kein `RELEVANT`, kein `KNOWN PEOPLE`.** Brenna steht nur in der World-Envelope-Zeile; `PLAYER ACTIONS`: „the clerk logs it“. **Chatverlauf enthält I63–I69** einschließlich des Flirts | **fehlerhaft:** „You're the one who took the grotto job yesterday, aren't you. Red eyes. I thought I'd written that name before.“ |

### 3.2 I70 – Speicherung, Bereitstellung und Verwendung getrennt

- **Speicherung:** vorhanden. **[B]** Name, zwei bedeutsame Erinnerungen und ein Wissenseintrag zum neuen Auftrag.
  Es fehlte nur die Haltung, weil nie ein `attitude`-Delta kam.
- **Kontextbereitstellung: fehlgeschlagen. [B]** Ohne Kürzung hätte die Karte (rekonstruiert) gelautet:
  > Brenna — person, Guild clerk; … · toward Alaric: no established attitude; knows him by name · last meaningful:
  > [Day 2, 08:15] … put off his dinner invitation until he has more lines in her ledger · also remembers: … the
  > Drowned Lantern … sixty copper paid out

  Sie wurde verworfen, weil die Priorität-0-Abschnitte (Gildenliste 306, Questerinnerung 368, Spieleraktion 226
  Tokens) das Budget von 1400 bereits ausfüllten. Der rohe Chatverlauf war dagegen vorhanden.
- **Verwendung: fehlerhaft. [B]** Der Erzähler widersprach dem Verlauf von zwei Nachrichten zuvor.
- **[H] Mitwirkende Faktoren:**
  - Ohne Karte fehlt die strukturierte Zeile „knows him by name“.
  - Die Aufgabe des Zugs war bürokratisch formuliert („the clerk logs it and hands him its contract slip“) und nannte
    Brenna nicht namentlich.
  - Der Vertrag betont stark „A stranger is normally treated as a stranger“.
  - Alle drei begünstigen die Standardszene „Schreiberin prüft neuen Abenteurer“.
- **[H] Nicht bewiesen:** dass die Karte allein den Fehler verhindert hätte. Die zwei geprüften Fälle mit Karte (I64,
  I66) sprechen dafür.

### 3.3 I62 – Brennas falsche Aussage zum abgeschlossenen Auftrag

Es ist **kein** fehlender Questabschluss; die Engine hatte korrekt gebucht. Die Ursache besteht aus drei belegbaren
Teilen:

1. **Speicherlücke [B]:** Brenna besaß kein Wissen über die Abgabe (Reihenfolge der Events, §2.3 Nr. 2).
2. **Schwache Bereitstellung [B]:**
   - Beim Blockaufbau stand Alaric noch im Gasthaus. Brenna war weder anwesend noch im Spielertext genannt (nur
     „guild hall“), also ohne Karte. `KNOWN AT` liefert nur Namen und Rolle.
   - Die Abgabe lag außerhalb der 4 Spielerzüge des Chatfensters.
   - Der einzige Hinweis war die anonyme Zeile „[completed]“ in der Gildenliste.
3. **Verwendung [B]:** Der Erzähler übersah diese Zeile und erfand einen Ledger-Rückstand.

Die Einschätzung im [Host-Log-Audit](../testrun_10b/user-20261104-162404/HOST_LOG_AUDIT.md) („Narrator widerspricht
vorhandenem Zustand“) bleibt richtig, ist aber unvollständig: Der Zustand war nur schwach und unpersönlich verfügbar.

## 4. Bewertung der Roadmap

Die bisherige Reihenfolge lautet:
1. unmittelbare Gesprächskontinuität
2. Wiederbegegnungen und zuverlässiger Recall
3. bedeutungsvolle persönliche Erinnerungen
4. beständige Persönlichkeit und Beziehungen
5. Eigenleben und PULSE

| Schritt | Bewertung |
|---|---|
| **1. Unmittelbare Gesprächskontinuität** | **Richtig an erster Stelle, aber anders zu verstehen.** Belegt ist ein Auslieferungsproblem, kein Gedächtnisproblem. Lösung: Karte des Gesprächspartners garantiert und kompakt, Budget-Hygiene, die zwei Datenfehler aus §2.3. Klein und gut testbar. |
| **2. Wiederbegegnungen / Recall** | **Richtig als Zweites.** Belegte Lücke I62: Ankunft an einem bekannten Ort bringt nur Namen. Braucht dieselbe Kompaktkarte wie Schritt 1, also teilweise zusammenlegen. |
| **3. Bedeutungsvolle Erinnerungen** | **Teilweise schon vorhanden.** Die Speicherung bedeutsamer Momente funktioniert. Es fehlen Absprachen und Versprechen, also Threads mit NPC-Bezug, und die Beziehungswirkung. Mit 2 zu „Episoden und offene Absprachen“ zusammenfassen. |
| **4. Persönlichkeit und Beziehungen** | **Aufteilen.** (a) Ein kurzer **Persönlichkeitsanker** (Temperament, Interessen, Art zu sprechen) ist billig und betrifft genau das Feedback „Temperament und Persönlichkeit“: **vorziehen** hinter 1/2. (b) **Beziehungsverlauf** mit Geschichte ist größer und bleibt hier. |
| **5. Eigenleben / PULSE** | **Richtig zuletzt.** Setzt stabile Identität, Agenda und Absprachen voraus. Nur kleine, gebuchte Folgen; keine Agenten pro Tick (wie W4/W5). |

**Fehlende oder anders zu priorisierende Schritte:**
- **Schritt 0 – Diagnose sichtbar machen.**
  - `buildContext()` liefert `dropped` bereits, aber das Record speichert es nicht. Für diese Analyse musste der
    Kontext nachgebaut werden.
  - Ohne gespeicherte Abschnittsliste und die gelieferten NPC-IDs je Zug lassen sich persönliche Tests (W1) kaum
    sauber auswerten.
- **Querschnitt – Auswahl wichtiger NPCs (Salienz).** Entscheidet, wer Persönlichkeitsanker, Kompaktkarte bei
  Ankunft und später Beziehungsverlauf bekommt. Muss vor 4b feststehen, sonst wachsen Prompt und Speicher
  ungesteuert.
- **Institutionelles Wissen.** Dass „die Gilde“ eine Abgabe weiß, sollte nicht davon abhängen, wann die Schreiberin
  die Szene betritt. Die Engine kennt die Buchung; die Gildenkarte kann sie deterministisch zeigen.
- **Leichte Konsistenzrückmeldung.** Die vorhandenen `CORRECTIONS` reichen vermutlich aus, wenn eine Antwort einer
  gebuchten Tatsache widerspricht. **[H]** Nicht als zweiter Prüfer-Modellaufruf.

## 5. Eigene Ergänzungen und Ideen

Ziel: glaubwürdige, eigenständige NPCs, weder bloßer Erinnerungsspeicher noch auf Alaric zugeschnittene Begleiter.
Sortiert nach Nutzen pro Aufwand.

1. **Garantierter Gesprächspartner-Slot.**
   - Wer im Zug angesprochen wird (namentlich, als Ziel einer Aktion, letzter Sprecher), bekommt immer eine
     **Kompaktkarte**. Das Muster gibt es bei `rules`/`envelope` schon: eigenes Budget, höchstens 2 Personen, je etwa
     60–100 Tokens.
   - Inhalt: Name/Rolle, Persönlichkeitsanker, Haltung, Identitätsstufe, letzter bedeutsamer Moment, offene Absprache.
   - Übrige Anwesende behalten die bisherige Vollkarte nach Budget.
2. **Budget-Hygiene statt Budget-Erhöhung.**
   - Gildenliste nur mit eigenen aktiven und heute ausgehängten Aufträgen; erledigte und abgelaufene nur als
     Kurzvermerk oder nur in Gildenzügen.
   - Feste Textbausteine (Questerinnerung, Annahme) kürzen.
   - Erst danach eine moderate Erhöhung (z. B. auf 1800) erwägen. **[E]**
3. **Persönlichkeitsanker über vorhandene Faktprädikate.**
   - `RECORD_PREDICATES` (`context.js:36`) kennt bereits `occupation`, `appearance`, `voice`, `agenda`; ergänzen um `temperament`,
     `interest` und Umgangsart.
   - Gesetzt nur, wenn die Erzählung es zeigt; der Vertrag verbietet erfundene Biografien.
   - Nur für wichtige NPCs (Salienz), höchstens etwa 25 Wörter.
   - Wirkung: dieselbe Brenna bleibt trocken, genau und schwer zu beeindrucken, ohne Chatverlauf.
4. **Haltung mit Begründung statt nur einer Zahl.**
   - Das `attitude`-Delta existiert; der Extractor nutzt es nicht. Er braucht eine klarere Abgrenzung, was eine
     „echte“ Veränderung ist: ein gelungener Flirt, ein gewonnenes Vertrauen, eine kleine Kränkung, jeweils als kleines
     Delta mit `why`.
   - Die Karte zeigt die letzten ein bis zwei Begründungen („amüsiert über seinen Charme, hält Abstand“).
   - Keine Romanzen-Mechanik, keine automatische Zuneigung.
5. **Offene Absprachen als NPC-bezogene Threads.**
   - Die Thread-Arten `promise`/`debt` gibt es schon.
   - Erfasst werden sollen auch vom Spieler gesetzte Verabredungen und Aufschübe („ask me again when…“, „tell me
     tomorrow whether…“), sichtbar als „offen zwischen euch“.
   - Ein Thread ist eine Erinnerung, keine Pflicht: Der NPC darf sie vergessen, ablehnen oder selbst aufgreifen.
6. **Kompaktkarten bei Ankunft.** Wenn `KNOWN AT` bei einer Reise Personen nennt, für die ein oder zwei wichtigsten
   die Kompaktkarte mitgeben. Das hätte I62 wahrscheinlich verhindert. **[H]**
7. **Gildenwissen deterministisch.** Eine Gildenkarte oder -zeile „Guild record for Alaric: active … · completed …“,
   abgeleitet aus dem Questzustand. Unabhängig von Anwesenheit; Kanon: „branches share the rolls“.
8. **Salienz statt manueller Pflege.**
   - Wichtigkeit eines NPC aus vorhandenen Daten: Zahl der direkten Gespräche, bedeutsame gemeinsame Erinnerungen,
     Name bekannt, offene Absprachen, Haltung ungleich neutral, fester Arbeitsort an einem oft besuchten Ort.
   - Hintergrundfiguren bleiben Hintergrund, wie der Vertrag es verlangt.
9. **`#npc` – Bewertung.**
   - **[B] `#npc <name>` gibt es bereits** als Informationspanel („what Alaric knows about someone“).
   - Der Vorschlag des Nutzers ist eine **Markierung** („diesen NPC wichtig halten“).
   - Pro: deterministisch, ohne Modellaufruf, ohne Fehlklassifikation, sofort als Zwischenlösung nutzbar.
   - Contra: Meta-Pflege durch den Spieler; Gefahr, dass NPCs sich nach der Spielergunst statt nach eigener Logik
     richten.
   - **Empfehlung:** automatische Salienz als Standard, optional `#npc pin/unpin <name>` als kleiner Zusatz, der nur
     Kontextpriorität und Speichertiefe erhöht, niemals Zuneigung oder Begleitung. **[E]**
   - Zusätzlich das vorhandene Panel um „so sieht der Erzähler sie gerade“ erweitern (Diagnose).
10. **Situationsabhängige Reaktionen ohne Simulation.** Stimmung, Beschäftigung, Tageszeit und Arbeitslast kann der
    Erzähler aus Persönlichkeitsanker und Szene ableiten. Keine Tagespläne oder Bedürfnisse als Engine-Zustand.
11. **Bogen-Gedächtnis erst später.** Eine verdichtete Beziehungsgeschichte je wichtigem NPC (Recherche §4.4) lohnt
    erst, wenn ein NPC viele Momente hat. Sie kostet einen zusätzlichen Aufruf an Szenenbrüchen und muss eventbasiert
    sein.
12. **Eigenständigkeit schützen.**
    - Jede neue Kartenzeile gehört dem NPC: eigene Interessen, eigene Grenzen, Recht auf Ablehnung und Abkühlung.
    - Haltung und Interesse an Alaric brauchen einen erzählten Grund.
    - Keine automatische Annäherung durch wiederholtes Ansprechen.
    - Die Regel „A stranger is a stranger“ bleibt für Fremde richtig; sie darf aber nicht für Bekannte gelten, wenn
      deren Karte fehlt. Das löst Nr. 1.

## 6. Technische Machbarkeit und empfohlene Reihenfolge

| Etappe | Inhalt | Aufwand | Risiko | Abhängigkeiten | Prompt / Modell / Performance / Persistenz | Persönlicher Testfall |
|---|---|---|---|---|---|---|
| **E0 Diagnose** | gelieferte Abschnitte und NPC-IDs je Zug im Record speichern; `#npc` zeigt die Erzählerkarte | **XS–S** | sehr gering | – | kein Prompteffekt; ein kleines Record-Feld; keine Event-Änderung | jede Testszene auswertbar ohne Nachbau |
| **E1 Sofortkontinuität** | Gesprächspartner-Slot mit Kompaktkarte; Budget-Hygiene; Faktobjekt-Fehler beheben; Gildenwissen bei Abgabe oder als Gildenzeile | **S** | gering; Replay-Kontexte ändern sich, Events kaum | E0 empfohlen | +100–250 Tokens, teils durch Kürzungen ausgeglichen; kein Zusatzaufruf; vorhandene Events | Flirt → Board → Registrierung bei derselben Person (Brenna-Szene) |
| **E2 Wiederbegegnung und Absprachen** | Kompaktkarten bei Ankunft (`KNOWN AT`); Spieler-/NPC-Absprachen als `promise`-Thread; `attitude` im Extractor kalibrieren | **S–M** | mittel: zu viel oder zu wenig erfasst, ggf. mehr Repairs | E1 | Extractor-Prompt +~300 Zeichen; Karten +40–80 Tokens; Threads sind Events | „Frag mich morgen…“ → Übernachtung → Rückkehr |
| **E3 Persönlichkeitsanker** | `temperament`/`interest`/Umgangsart als Faktprädikate; nur für wichtige NPCs auf der Karte | **S–M** | mittel: Modell erfindet Persönlichkeit zu früh | E1, Salienz-Grundregel | +20–40 Tokens je Karte; Fakten als Events | dieselbe Figur nach mehreren Tagen und Orten gleich im Ton |
| **E4 Salienz + optional `#npc pin`** | Wichtigkeitswert aus vorhandenen Daten; Markierung als native Eingabe wie `#pay` | **M** | gering bis mittel (Auswahlfehler) | E1–E3 | deterministisch; ein Event für die Markierung | 3 wiederkehrende Stadt-NPCs + 1 bewusst markierter |
| **E5 Beziehungsverlauf** | Haltungsgeschichte, wichtige Wendepunkte; später Bogen-Gedächtnis | **M–L** | mittel bis hoch (Kosten, Widersprüche) | E2–E4 | zusätzlicher Aufruf nur an Szenenbrüchen; eventgebunden | Vertrauen gewinnen und verlieren über 5–10 Tage |
| **E6 Eigenleben / PULSE** | NPC-Agenda mit kleinen gebuchten Folgen; PULSE als Ereignisfenster (W4/W5) | **L–XL** | hoch | E1–E4, PULSE-Fachplan | gemäß Roadmap; keine Simulation pro Tick | NPC verfolgt eine eigene Sache, während Alaric fort ist |

**Schnell mit vorhandenen Mechaniken:** E0, E1, große Teile von E2 und E3. Sie nutzen bestehende Fakten, Threads,
`attitude`, Prioritäten und eigene Budgets und brauchen weder eine neue Datenbank noch einen zusätzlichen
Modellaufruf.

**Größere Architekturarbeit:** E5 (wenn verdichtetes Gedächtnis) und E6.

**Empfohlene Reihenfolge zum Planen und Testen:** E0 → E1 → persönlicher Test → E2 → E3 → persönlicher Test →
Entscheidung über E4 (`#npc pin` ja/nein) → E5 → E6. Nach E1 ist der Brenna-Fall der direkte Abnahmefall.

**Nicht empfohlen:**
- eine zweite Dossier- oder Vektordatenbank;
- ein NPC-Agent je Figur;
- ein Prüfer-LLM für jeden Zug;
- eine pauschale Budgetverdopplung ohne Umordnung;
- eine Romanzen- oder Beliebtheitsmechanik;
- erfundene Biografien beim ersten Auftritt.

## 7. Offene Designentscheidungen [E]

1. **`#npc pin`:** gewünscht als optionaler Zusatz zur automatischen Auswahl, oder lieber nur automatisch?
2. **Sichtbarkeit von Beziehungen:** Soll der Spieler Haltung und offene Absprachen eines NPCs im HUD bzw. im
   `#npc`-Panel sehen, oder nur über die Erzählung?
3. **Persönlichkeit:** ausschließlich aus der Erzählung gesetzt (empfohlen, vertragskonform), oder bei wichtigen NPCs
   zusätzlich ein knapper Startanker beim ersten Auftritt?
4. **Flirt und Romantik:** Wie weit darf eine Beziehung gehen, und bleibt die volle Freiheit des NPCs zum Ablehnen und
   Abkühlen ausdrücklich Kanon?
5. **Vergessen:** Sollen unwichtige Momente bewusst verblassen (Recency), während Absprachen bis zur Erledigung
   bleiben?
6. **Budget:** Ist eine moderate Erhöhung des Engine-Blocks nach der Hygiene akzeptabel, wenn die Messung (E0) sie
   rechtfertigt?

## 8. Abgrenzung

Nicht behauptet:
- dass das Modell mit Karte immer korrekt gehandelt hätte;
- dass 1400 Tokens allgemein zu wenig sind;
- dass der Erzählervertrag falsch ist;
- dass die Wegfallquoten auf andere Läufe übertragbar sind (ein Lauf, 31 Züge);
- dass `attitude` in anderen Läufen ebenso fehlt.

Für eine belastbare Quote dieselbe Rekonstruktion auf frühere Batch-Chats anwenden; das ist nicht Teil dieses
Auftrags. Keine Produktdateien geändert, keine Tests ausgeführt.

## 9. GPT-Gegenbewertung vom 05.11.2026 – nach Code-/Quellenabgleich

**Status: fachliche Gegenbewertung, kein neuer Test, keine Produktänderung oder Implementierungsfreigabe.** Nachgelesen wurden die zentrale Kontext-Priorisierung in `src/context.js` (Produktbasis .155), die `npcCard()`-Verwendung, `src/v4/world.js` (`fact` / `mapRef`) sowie die im Originalchat erhaltenen Brenna-Szenen. Claudes exakte modellbezogene Logzuordnung, die Quoten **7/17** und **26/31** sowie die jeweilige Budget-Rekonstruktion stammen aus dieser Analyse und wurden von GPT **nicht unabhängig vollständig neu gerechnet**.

### 9.1 Bestätigte Kernaussage und wichtige Präzisierung

- **Der Kernbefund trägt:** Der `buildContext()`-Packer hält Priorität-0-Text fest und nimmt den gesamten `ACTIVE SCENE`-Block erst bei ausreichendem Restbudget (Priorität 1). Er kann dadurch ausgerechnet die Karte des anwesenden Gesprächspartners wegen Gilden-/Quest-/Aktionsumfang verwerfen. Bereits gespeicherte `memory.recorded`-Events beweisen nicht, dass der Erzähler den Inhalt bekam.
- **I70 hat zwei getrennte Komponenten:** Die unmittelbar vorherige Flirtantwort war als Chattext noch sichtbar; die strukturierte Brenna-Karte samt „knows him by name“ und der bedeutenden Dinner-Erinnerung fehlte laut tatsächlichem Request. Der Erzähler behandelte sie dennoch wie eine flüchtige Bekanntschaft. **Weder vollständige Karte noch mehr Tokens garantieren allein** eine konsistente Modellantwort; genau deshalb ist die natürliche Brenna-Folge die Abnahme.
- **I62 ist besonders sorgfältig zu formulieren:** Technisch fehlte Brennas formaler `knowledge`-Eintrag für die gebuchte Questabgabe, weil `scene.moved`/Anwesenheit und Abschlussfakt ungünstig aufeinanderfolgen. **Die erzählte Brenna persönlich hatte die 60 cp bereits ausbezahlt und darüber gesprochen.** Die fehlende Wissensbuchung darf diese etablierte gemeinsame Erfahrung nicht rückwirkend aufheben. Die Gilde kennt den abgeschlossenen Zustand, der Narrator erhielt ihn nur als schwachen unpersönlichen `[completed]`-Eintrag.
- **Speicherpfad:** `fact.o` geht derzeit tatsächlich durch `mapRef()`; in den Original-Events stehen zwei auf dieselbe NPC-ID verkürzte Freitextwerte. Korrektur nur dort, wo `o` freie Aussage statt echte Referenz ist; niemals sämtliche legitimen Objekt-/Entity-Bezüge unkontrolliert in Text verwandeln.

### 9.2 Bewertung von Tragweite und Risiko

- **E0 (Diagnose) und E1 (Sofortkontinuität) sind die wertvollste erste Einheit**, fachlich getrennt planbar und gegen den konkreten User-Test prüfbar. Die 7/17- und 26/31-Werte charakterisieren **einen** natürlichen Lauf, keine allgemeine Ausfallquote über andere Konfigurationen. Ein Dialog kann zudem trotz vollständiger Karte misslingen.
- **Geringer Featureumfang heißt nicht risikofrei:** Prioritäten, Budget, Personenidentifikation, Wissen bei Ortswechsel/Questturn-in und freie Faktobjekte sitzen an gemeinsam genutzten Schnittstellen. Regressionen für abwesende NPCs, unbekannte Namen, Geheimnisse, Conversation-/Quest-Context, normale World-Fakten und Replay/Swipe/Reload sind wichtiger als bloße Prompt-Stringtests.
- **Budgethygiene vor pauschaler Erhöhung.** Die genannten zusätzlich etwa 100–400 Tokens sind eine plausible lokale Größenordnung, **keine belegte kostenlose oder allgemein vernachlässigbare Ausgabe**. Effekt auf Cache, Latenz, Sichtbarkeit anderer wichtiger Abschnitte und Rolle des Narrators vor/nach Eingriff messen. Keine zusätzliche Modellinstanz/zweite Memorybank ohne belegten Gewinn.
- **Kein automatisches Romantiksystem:** Null `attitude`-Deltas zeigt fehlende Nutzung einer bestehenden Schicht, belegt aber **nicht**, dass der Flirt zwingend einen Zahlenanstieg oder romantische Bereitschaft auslösen müsste. Entscheidend ist die Fortsetzung der zuvor gezeigten persönlichen Reaktion – inklusive Ablehnung, Distanz und Eigeninteressen. Keine mechanische „Zuneigung durch Wiederholung“.
- **Offene Verabredungen:** Eine persönlich wichtige Bitte wie „frag mich morgen nach Marda“ darf erzählerisch wieder aufgreifbar bleiben; daraus wird weder eine formale Privatquest noch eine automatische Verpflichtung des NPC. `promise`/`debt`-Threads nicht inflationär für jedes Höflichkeitswort erzeugen.

### 9.3 Empfohlene eng abgegrenzte Umsetzungsetappen

1. **E0 – Kontextdiagnose:** Für jeden tatsächlichen Narrator-Turn die gelieferten/verworfenen Abschnitte und wichtigen NPC-IDs nachvollziehbar machen, ohne Extra-LLM oder zusätzliche State-Wahrheit.
2. **E1 – Aktuelle Person korrekt liefern:** Einen kompakten, situationsgebundenen Gesprächspartnerkontext trotz großer Quest-/Boardblöcke erhalten; mehrfach gesendete Pflichttexte reduzieren. Den nachgewiesenen Freitext-/Referenzfehler sowie den Gildenwissens-/Abgabe-Zeitpunkt gezielt absichern. **Tests:** Original I66→I71, alte Queue/World-Reihenfolge, Quellen- und Geheimsphärenschutz, natürliche GLM-Fortsetzung.
3. **E2 – Wiederbegegnungen und offene Gesprächsfäden:** Bei autorisierter Rückkehr erinnerte Personen anzeigen, ohne sie deshalb als anwesend zu erzwingen. Wenige bedeutende Absprachen bleiben wiederaufgreifbar.
4. **E3 – Knappes, belegtes Temperament / eigene Interessen:** Früher als große Beziehungsmechanik, aber nicht beliebig aus einem Erstkontakt festschreiben. Stil darf situationsabhängig sein.
5. **E4 – Salienz und später Beziehungsgeschichte:** Automatische Wichtigkeitsauswahl als Standard; ein möglicher `#npc pin/unpin` ist neue, optionale Funktion, **nicht** mit dem vorhandenen `#npc <name>`-Infopanel verwechseln. Sichtbarkeit und Wirkung zuerst fachlich entscheiden.
6. **E5 – Eigenleben / PULSE:** Erst nach konsistenten wiederkehrenden Figuren, Kenntnisquellen und glaubwürdigen Beziehungen. Keine Agentenroutine für jedes NPC pro Tick.

**Abnahmeprinzip:** Nicht verlangen, dass Brenna einen Flirt ständig wiederholt oder eine Einladung annimmt. Nach „Flirt → Board lesen → bei ihr Quest registrieren“ muss sie aber denselben Alaric und die jüngste Gesprächssituation plausibel wiedererkennen. Nach der Rückkehr soll eine bereits selbst bearbeitete Gildenabgabe nicht ohne neue begründete Ursache als unbekannt gelten. Erfolgreiche technische Promptübergabe und natürliche Reaktion **getrennt** ausweisen.

### 9.4 Noch beim Nutzer offen

Die sechs in [§7](#7-offene-designentscheidungen-e) aufgelisteten Fragen sind **nicht beantwortet**. GPT bevorzugt vorläufig: automatische NPC-Priorisierung, optionales Pin erst nach Bedarf; bekannte Absprachen ggf. im `#npc`-Panel, keine geheimen Gefühlswerte; Persönlichkeit aus erzählten Belegen; volle NPC-Freiheit bei Nähe/Distanz; Alltagsdetails dürfen verblassen, noch wichtige Absprachen bleiben erreichbar; moderates Budgetplus nur nach Messung. **Das sind Empfehlungen, keine beschlossenen Designregeln.**

**Dokumentenordnung:** Diese Datei hält die tatsächliche NPC-Analyse samt Gegenbewertung. Die übergeordnete Reihenfolge steht nur in [07](../07_ROADMAP_NACH_10B_ENTWURF.md), der aktuelle Produkt-/Freigabestatus nur in [03](../03_AKTUELLER_PROJEKTSTAND.md); keine separate doppelte NPC-Roadmap in 04 oder 06.


## 10. Sol-Gegenreview auf .157 und nächste Datengrundlage (05.11.2026)

**Status:** Analyse und Dokumentation, kein Produktpatch und keine neue Testausführung. Geprüft wurden die Roadmap und diese Analyse auf main `dfc6433` sowie die betroffenen Codepfade auf **.157 / `b31123f`**. Claudes ursprüngliche Untersuchung (§§0–8) und die GPT-Gegenbewertung (§9) bleiben unverändert erhalten. Die Logquoten **7/17** und **26/31** stammen aus Claudes Auswertung; Sol hat sie in diesem Gegenreview nicht unabhängig neu berechnet.

### 10.1 Gesamturteil und bestätigte Grundlagen

Die Richtung trägt: Vorhandene Erinnerungen, Identitäten, Wissensquellen und Threads zuerst zuverlässig für die aktuelle Erzählung bereitstellen. Eine neue Memorybank, ein permanenter Prüfer-LLM oder eine vollständige NPC-Simulation sind dafür nicht begründet.

Am aktuellen Code bestätigt:
- `buildContext()` hält Priorität 0 auch oberhalb des normalen Budgets; `ACTIVE SCENE` enthält dagegen sämtliche Anwesenden als einen gemeinsamen Block mit Priorität 1. Lange Pflichtabschnitte können deshalb die Karte des aktuellen Gesprächspartners vollständig verdrängen. Nur mehr Erinnerungen zu speichern behebt diesen Übergang nicht.
- Speicherung, tatsächliche Auslieferung und Modellverwendung bleiben drei verschiedene Prüfungen. In der Brenna-Szene war laut Originalanalyse auch der jüngste Dialog im Chat sichtbar. Die fehlende Karte ist ein technischer Beitrag, aber kein Beweis, dass das Modell mit Karte sicher richtig reagiert hätte.
- Die vorhandene Wissensbegrenzung und Eventpersistenz sollen erhalten bleiben. Fehlende technische Wissensbuchung darf ein tatsächlich erzähltes gemeinsames Erlebnis nicht rückwirkend aufheben.
- Fehlende `attitude`-Deltas beweisen keinen notwendigen Sympathieanstieg. Eine Einladung darf abgelehnt werden; dennoch muss die nächste Antwort nachvollziehbar an das gerade geführte Gespräch anknüpfen.

**Budgethygiene betrifft mehr als die Gildenliste.** Beispielsweise hängt der Priorität-0-Abschnitt `help` aktuell sämtliche gespeicherten Geldgeschenke an; aktive Quests bringen wiederkehrende Regeltexte mit. Die spätere Umsetzung sollte kontextrelevante Pflichtinformation von historischem Detail trennen, ohne Ledger, Questzustand oder Buchungsschutz zu verändern. Nicht einfach alle NPC-/Recall-Texte ebenfalls unbegrenzt zu Priorität 0 machen.

### 10.2 Drei notwendige technische Präzisierungen

**A. Freitext wird an zwei Übergängen als Referenz gelesen.**

In [world.js, fact](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b31123ffb4d3f5c404d6add85449ea869ed415ee/avereth-engine/src/v4/world.js#L1162) geht `fact.o` durch `mapRef()`. Anschließend versucht der gemeinsame Adapter in [delta.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b31123ffb4d3f5c404d6add85449ea869ed415ee/avereth-engine/src/delta.js#L518) erneut `resolve(f.o)`.

Der für Namenserweiterungen gedachte Resolver kann einen mehrwortigen Satz, der mit dem etablierten einteiligen Namen „Brenna“ beginnt, als erweiterten Personennamen auffassen. Eine Korrektur allein in World könnte deshalb im nachfolgenden Adapter wieder verloren gehen. **Codebestätigter Übergang; hier kein neuer Ausführungsnachweis.**

Für E1: Freie Aussagen über beide Übergänge als Text erhalten; echte IDs, lokale Referenzen und eindeutige Personenbezüge weiterhin unterstützen. Keine globale Abschaltung des Resolvers und keine neue Prosa-Negativwortliste. Regressionen müssen den vollständigen Weg bis zum gespeicherten Fakt und legitime Namens-/Beziehungsreferenzen prüfen.

**B. Haltung wirkt schon auf die Kampf-Seitenzuordnung.**

[sideOf()](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b31123ffb4d3f5c404d6add85449ea869ed415ee/avereth-engine/src/v4/scene_handles.js#L185) ordnet einen NPC ohne vorrangige Kampf-/Bedrohungszuordnung ab `attitude >= 20` als `ally` ein. Das bedeutet nicht, dass er allein dadurch automatisch einem Kampf beitritt; es ist aber bereits mechanisch wirksame Information.

Eine stärkere soziale Befüllung von `attitude` wäre deshalb keine reine Erinnerungsverbesserung. Sympathie, Vertrauen und tatsächliche Kampfverbundenheit müssen vor einer neuen Kalibrierung fachlich abgegrenzt werden. **E0/E1 sollte keine automatische Flirt-/Sympathiepunktevergabe aktivieren.** Erst Wiedererkennung und Kontinuität verbessern; soziale Zahlenregeln später mit den Kampfgegenfällen prüfen.

**C. Erzählerdiagnose und normales Spielerwissen unterscheiden.**

Die [NPC-Erzählerkarte](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b31123ffb4d3f5c404d6add85449ea869ed415ee/avereth-engine/src/context.js#L185) kann private Agenda und geheime Kenntnisse enthalten. Das vorhandene `#npc`-Panel zeigt dagegen Alarics Wissen.

„So sieht der Erzähler die Person“ darf deshalb nicht ungefiltert Teil der normalen Spieleransicht werden. Bekannte gemeinsame Erlebnisse und Absprachen können dort erscheinen; vollständige Karten gehören gegebenenfalls in eine ausdrücklich gewählte Diagnoseansicht. E0 benötigt vor allem kompakte Metadaten zum tatsächlich verwendeten Kontextstand: Abschnitte, NPC-IDs, Budget und Tokenumfang. Keine vollständige Promptkopie in jedem Record und keine zweite Zustandswahrheit.

### 10.3 Bewertung der Umsetzungsschnitte und Roadmap

- **E0 und E1 als erstes zusammenhängendes NPC-Fachpaket:** Kontextdiagnose, begrenzte kompakte Gesprächspartnerkarte, Budgethygiene sowie die belegten Fakt-/Gildenwissensübergänge. Keine gesonderte Mikrobuildserie nur für Diagnosefelder. Gerade die World-/Adapter- und Ankunfts-/Wissensschnittstellen sind gemeinsam genutzt; die Einstufung „klein“ ersetzt keine Integrationsprüfung.
- **Eine minimale Relevanzauswahl wird schon in E1/E2 gebraucht.** Aktueller Gesprächspartner und wenige für die Rückkehr relevante Personen müssen bestimmt werden. Eine umfangreiche Wichtigkeitsskala oder manuelles Pinning ist dafür noch keine Voraussetzung; ein weitergehendes Salienzsystem kann später folgen.
- **Gildenwissen gezielt bereitstellen:** Bei legitimer Gildeninteraktion den kanonischen Auftragszustand verständlich zeigen. Die korrekte Beschränkung von `witnessEvents()` auf tatsächlich Wahrnehmende nicht aufweichen und später eintretenden NPCs nicht pauschal rückwirkendes Wissen geben.
- **Persönlichkeitsanker früh und knapp, größere Beziehungsgeschichte später.** Rolle, Stimme, Agenda und Erinnerungen existieren bereits. Wenige belegte Merkmale können daran anschließen; kein fixes Persönlichkeitsprofil aus einer einzigen Reaktion erzwingen.
- **Ein einfacher PULSE-Prototyp braucht nicht erst vollständige langfristige Beziehungen.** Spontane Weltbegegnungen und spätere Folgen individueller NPC-Agenden sind unterschiedliche Ausbaustufen. Empfehlung bleibt: stabile Grundkontinuität zuerst, dann bei Freigabe begrenzter Weltprototyp; die aufwendige Agenda-/Beziehungsanbindung später. Keine neue PULSE-Umsetzungsfreigabe durch diesen Review.

**Etappenkennungen:** Claudes Originaltabelle in §6 reicht bis E6; die aktuelle Roadmap fasst Salienz und Beziehung unter E4 zusammen und nennt Eigenleben E5. Für den ersten Patch ist E0/E1 eindeutig. Spätere Aufträge sollen Fachthema und Umfang zusätzlich zur Nummer benennen; die historische Tabelle wird hier nicht still umnummeriert.

### 10.4 Nächster persönlicher Test und Nutzerpriorität

**Nutzerentscheidung 05.11.2026:** Jetzt folgt ein weiterer persönlicher User-Test für zusätzliche NPC-Daten. Sofern dabei keine relevanten technischen Fehler auftreten, soll der nächste Fachpatch der **erste NPC-Patch** sein. Stealth S2 ist dafür keine Vorbedingung. Der konkrete Patchschnitt wird mit den neuen Originaldaten abgeglichen; in diesem Dokumentationsschritt wird nichts implementiert. Aktueller Ablauf in [03](../03_AKTUELLER_PROJEKTSTAND.md), übergeordnete Reihenfolge in [07](../07_ROADMAP_NACH_10B_ENTWURF.md).

Für die Auswertung sind, soweit im freien Spiel vorkommend, besonders nützlich: dasselbe Gespräch nach einer Zwischenhandlung fortsetzen; einen bekannten NPC später wiedersehen; eine tatsächlich etablierte Absprache wieder aufgreifen; nachvollziehen, was die Figur über Alaric wissen konnte. Das sind Beobachtungspunkte, keine vorgeschriebene Questfolge, kein Pflichtflirt und kein verpflichtendes NPC-Skript.

Originalchat mit Records, Eventexport und möglichst der vorhandene Serverlog erlauben den Abgleich von gespeichertem Inhalt mit dem tatsächlichen Narrator-Request. Die neuen E0-Diagnosefelder existieren noch nicht und werden für diesen Test nicht vorausgesetzt.

**Bewertungsmaßstab:** Wiedererkennung und glaubwürdige Fortsetzung einschließlich Distanz, Ablehnung und eigener Interessen. Kein garantierter positiver Beziehungsverlauf. Kleine fortsetzbare Erzählunstimmigkeiten allein rechtfertigen keine neue Technik-Mikrofixserie; wiederholte gültige Handlungsverluste, relevante Integritätsfehler oder technische Blockaden werden nach ihrer tatsächlichen Wirkung priorisiert.
