# Fachplan A – Ortsidentität und Bewegungsautorität

**14.11.2026 · Claude · Etappe 1 von 3, keine Implementierung, keine Designfreigabe.**

**Prüfstand:** Produktbranch bei `4438241` (`.189`); `main` bei `6f18156`. Zeilenangaben gelten für `avereth-engine/` bei `4438241`.

**Grundlagen:**
- [Grundanalyse](ORT_REISE_UMGEBUNG_ARCHITEKTUR_GRUNDANALYSE_2026-11-14.md) und [GPT-Gegenreview](ORT_REISE_UMGEBUNG_GPT_GEGENREVIEW_2026-11-14.md).
- Frühere Architekturtexte: [Fable](ARCHITEKTUR_AUDIT_10B_FABLE.md), [Opus 5.5](ARCHITEKTUR_GEGENREVIEW_10B_OPUS55.md), [O1/O2](FACHPLAN_O1_O2_KAUSALITAET_UND_TEILBEWEGUNG.md), [Kanon](../02_DESIGN_KANON.md).
- Gegenreviews der Batches [`.186`](../testrun_10b/npc-20261114-094810Z/GEGENREVIEW_OPUS.md) und [`.188`](../testrun_10b/npc-20261114-161005Z/GEGENREVIEW_OPUS.md).

**Nachweisgrade:**

| Kürzel | Bedeutung |
|---|---|
| **[C]** | Code gelesen |
| **[R]** | lesende Gegenprobe mit der Engine an einem gefalteten Originalzustand |
| **[D]** | aus Originaldaten gezählt |
| **[S]** | Schätzung mit Rechenweg |
| **[P]** | Hypothese |

## 0. Ergebnis

| Variante | Urteil |
|---|---|
| **A1** Ein Auflöser, eine Referenzprüfung | **notwendig, aber allein zu schwach** |
| **A2** Gemeinsamer Ortsvertrag mit kleinem Bewegungsnachweis | **empfohlen**; beruht auf dem vorhandenen `auth.gos` |
| **A3** Vollständiger Bewegungsplan (Weg, Hindernisse, Halte, Bedingungen) | **nicht empfohlen**: eine zweite Weltsimulation neben `applyWorld` |
| **A4** Ortswahl statt Ortsbau | **empfohlen als zweite Stufe**: Der Extractor wählt aus Kandidaten, statt Orte zu bauen; die Ankunft ist die Antwort des Bewegungsschritts |
| **A5** Ankunft vor der Erzählung für bekannte Ziele (V1) | **nicht empfohlen**, Daten bestätigen das Opus-5.5-Urteil |

**Kurzbegründung:**
- Die beobachteten Fehler entstehen, weil **Ziel, Umfang und Ebene einer Bewegung** an mehreren Stellen neu bestimmt werden.
- Weg und Halte fehlen nicht; die liefern `wayBetween` und PULSE schon heute.
- Ein kleiner, einmal bestimmter **Bewegungsnachweis** genügt, wenn ihn alle Stellen lesen und ein **einziger Auflöser** ein klares Ergebnis liefert.

**Was das nicht löst:**
- **Die Dungeon-Ebenenfrage:** Fachplan B.
- **Ankünfte ohne GO:** Fachplan C. Sie sind mit 16 von 26 abgelehnten Ankünften der größere Teil.

**Korrektur der Grundanalyse §3.2 [D]:** Die 144 Züge mit autorisierter Bewegung teilen sich auf in:
- GO zu bekannter ID 76,
- GO zu `{new}` 52,
- GO mit `within` 7,
- `journey.continue` 9.

Neue Ziele machen also 52 von 135 GOs aus (39 %), nicht 44 %. Mit `within` sind es 59.

---

## 1. Heutiger Ablauf vom Befehl bis zum gespeicherten Ort [C]

| # | Schritt | Funktion | Was dort über Orte entschieden wird |
|---|---|---|---|
| 1 | Planner-Kontext | `catalogPlaces` `catalog.js:95–139`, `routePlaces` `catalog.js:77–87`, gefiltert `planner.js:330` | welche Orte beworben werden; die Route nur, soweit beworben |
| 2 | Planner-Antwort | Plannerregeln 7a–7c, `mapPlan`, `retreatGo` `planner.js:743` | Ziel als ID, `{new: Wörter}`, `within`, Rückweg aus Wortlaut |
| 3 | GO-Handler | `commands.js:592–699` | Gildenziel (`guildDestination`), `knownByName`, Dungeon-Gate-Schritt, `dungeonGo` (eigene Wegsuche, `explore`), Existenz der ID gegen den ganzen Zustand (628), Zeitkappe, `livingGo`, Reiseleg, Falle, Vorhaben, `KNOWN AT`; schreibt `ctx.auth.gos` (636–649) |
| 4 | Erzählerzeile | `commands.js:697–698`, `THE WAY` 686–687, `DUNGEON AHEAD` (`living.js`) | was dem Erzähler als möglich angekündigt wird |
| 5 | Extractor-Schema | `placeRef` `extract.js:39–44` mit Enum aus `catalog.js:411` | welche Orts-IDs der Extractor schreiben darf |
| 6 | Parser | `scopedPlaces` `extract.js:482`, `sceneIssues` `extract.js:419–451` | neue Orte nachträglich unter Habitat oder Dungeon hängen; Chronologiepflicht |
| 7 | World: Normalisierung | `scopedPlaces` **erneut** `world.js:241` | dasselbe ein zweites Mal |
| 8 | World: Ortsauflösung | `arrivalPlace` `world.js:285–301` (Gate, Ebenen-Vorprüfung), `resolvePlace` `world.js:146–182` (Gildenziel, Eltern-Aufstieg, Dungeonraum, `placeIdentity`, **Anlegen**) | wohin ein `arrive` zeigt; **ein neuer Ort wird schon hier angelegt** |
| 9 | World: Weg | `viaStop` 2428, `wayRefused` 2434–2475 (Ebene, Siegel, Gate, `unseen`/`exploring`, `elsewhere`, `wayBetween`) | ob die Ankunft zulässig ist |
| 10 | World: Ankunft | `arriveThrough` → `arrive()` `world.js:2644–2781` | Zurückbleibende, Begleiter, Fortschritt, Vorhaben, Gildenbedingungen, Falle |
| 11 | World: Erwartung | `world.js:1717–1730` | `expected.arrived` ohne passendes `arrive` → `arrival_evidence` |
| 12 | World: Szene | `world.js:1064–1080` (`scene_context`) | Meldungen nach einer abgelehnten Ankunft |

**Mehrfach ausgeführte Entscheidungen [C]:**

| Entscheidung | Wo | Aufrufstellen |
|---|---|---|
| Name → Ort | `placeIdentity` (`place_refs.js:17`, 7 Stufen), `resolvePlace` (`world.js:146`, eigene Stufen und Anlegen), `knownByName` (`known.js:14`), `guildDestination`, `entranceOf`, `roomByName` | `placeIdentity` 8, `knownByName` 4, `guildDestination` 6 (4 Dateien) |
| Weg und Topologie | `dungeonGo` und `livingGo` (Befehlsseite), `wayRefused` (Weltseite) | `wayBetween` 7 (4 Dateien), `roomKnown` 7 (6 Dateien) |
| Ebene | `levelVia`, `floorRefusal` | 5 bzw. 7 Aufrufstellen (`floorRefusal` in 4 Dateien, davon 3 in `world.js`) |
| Neuer Ort unter Habitat oder Dungeon | `scopedPlaces` | zweimal je Antwort (Parser und World) |
| Gültige Orts-IDs | Katalog-Enum (Extractor), ganzer Zustand (GO, World), Katalogfilter (Route) | 3 verschiedene Mengen |

Dazu laufen in `world.js` neun `!explicitTravel`- und 16 `cPath`-Verzweigungen für alte Kampagnen weiter. `campaignSupport` (`runtime.js:127`) lässt nur noch Pfad C mit Ruleset 2 zu.

---

## 2. Originalproben

### 2.1 Was die Proben zeigen [R]

| Probe (Zustand gefaltet mit `.189`) | Ergebnis |
|---|---|
| **`.188` Rogue #81**, besuchter Ort `realm.duskreach.the_tannery_rows_behind_the_ashbridge_tanneries` (`known: visited`) | `placeIdentity` findet ihn **für keine** der Formen `{new:"the tannery rows", parent: loc.ashbridge}`, `{new:"the Tannery Rows", parent: realm.duskreach}` oder `{new:"the Tannery Rows behind the Ashbridge tanneries", parent: loc.ashbridge}`. `knownByName(..., reportedOnly:false)` liefert `null`. Der Planner buchte `go {new:"the tannery rows"}`, #82 legte `loc.ashbridge.the_tannery_rows` neu an |
| **`.188` Rogue #80** | derselbe Ort fehlt in `catalogPlaces` (Auftrag erledigt), obwohl `COMPLETED TODAY` ihn per ID nennt; Schemafehler, die Extraktion ging verloren |
| **`.186` Mage #63**, Ort `loc.pack_frame_beside_the_grotto_road`; Katalog enthält `loc.glimmerdeep_grotto` | Der Planner buchte `go {new:"the Grotto mouth"}`. `entranceOf` und `placeIdentity` lösen „the Grotto mouth“ **nicht** zum Dungeon auf, nur „Glimmerdeep Grotto“. Darum sagte die Weltprüfung `elsewhere`, fünf Antworten lang |
| **`.186` Mage #64–#76** | Bei jeder abgelehnten Ankunft blieb der neue Raum **trotzdem angelegt**: 5 verwaiste Räume in Glimmerdeep, nie betreten, in einem gemeinsam genutzten persistenten Dungeon. Ursache: `resolvePlace` legt vor `wayRefused` an |
| **`.188` Rogue #61/#62**, GO zur berichteten Stätte `loc.the_lime_pits_sluice` | `dungeonOf` liefert für sie die Tannery Rows: Das Viertel trägt `rooms: true`, weil Alaric zwei Innenräume betreten hat (Patch-7-Regel „Räume in der Wildnis machen ein Gebäude raumweise“). Die Stätte gilt als Raum ohne Weg; die autorisierte Ankunft wurde abgelehnt |
| **`.186` Warrior #121/#122** | GO zu einem neuen Wachhaus; der Extractor meldet `interior` unter dem Reich, `resolvePlace` lehnt ab („a interior cannot lie in Duskreach“). Eine zulässige Lesart (Stätte unter dem Reich, `placeParent` mit `c`) wurde nicht gewählt, weil die Art aus der Meldung stammt |
| **Gleichnamige Orte in allen sechs Endzuständen** | 0 Paare mit gleichem Namen im selben Reich (ohne Gildenhallen). 4 Paare, bei denen ein Name den anderen als Präfix enthält: zwei echte Duplikate (Tannery Rows; vielleicht die Seilerbahn), **zwei verschiedene Orte** (Stadt ↔ ihr Tor, Glassmere ↔ Akademie-Torhaus). **Ein Namensabgleich ohne Umfang würde verschiedene Orte zusammenlegen** |

### 2.2 Folgerungen

1. **Ein großer Teil der Fehler entsteht beim GO, nicht bei der Ankunft.** Hätte der GO-Handler „the tannery rows“ und „the Grotto mouth“ im **erreichbaren Umfang** eindeutig einem bekannten Ort zugeordnet, wären zwei Episoden nicht entstanden: `.188` #80–#86 und `.186` Mage #63–#82.
2. **Namensabgleich braucht einen Umfang und einen Mehrdeutigkeitsausgang.** Ein Präfix ohne Umfang erzeugt in den vorhandenen Daten so viele falsche wie richtige Treffer.
3. **Ort anlegen und Ankunft prüfen gehören in eine Reihenfolge:** erst prüfen, dann anlegen.
4. **Die Raumregel außerhalb echter Dungeons** gehört in Fachplan B. Fachplan A muss sie nur dort verwenden, wo sie gilt.

---

## 3. Varianten

### A1 – Minimale Konsolidierung

**Inhalt:**
- **Ein Auflöser** `resolvePlaceRef(state, ref, { scope, purpose })` ersetzt `placeIdentity`, die Namenslogik von `resolvePlace` und `knownByName`. Er liefert einen von vier Zuständen: `existing(id)`, `ambiguous(ids)`, `new(name, kind, parent)` oder `invalid(why)`.
- **Eine Referenzprüfung:** Das Schema prüft gegen die Sicht „bekannt“ statt gegen den Katalog. Die Route wird nicht mehr nach dem Katalog gefiltert.
- **Unverändert:** Reiseverfahren, `scopedPlaces`, `wayRefused`.

**Wirkung auf die Proben:**

| Probe | Ergebnis |
|---|---|
| Rogue #80 | ✓ |
| Tannery-Duplikat | ✓ nur, wenn der GO-Handler denselben Auflöser mit Umfang nutzt |
| `.186` Mage | ✓ unter derselben Bedingung |
| `.188` Mage, Rogue #62 | ✗ |
| Warrior #122 | ✗ |
| verwaiste Räume | ✗ |

**Entfällt:**
- die Sonderregel aktiver Jagdorte (`catalog.js:110–112`),
- der Routefilter (`planner.js:330`),
- doppelte Namenslogik (`placeIdentity`, Namensteil von `resolvePlace`, `knownByName`): die sieben Stufen gehen in eine geordnete Stufenregel auf.

**Bewertung:** wenig Risiko, klarer Gewinn. Lässt aber T1/T2 und den Zeitpunkt des Anlegens bestehen.

### A2 – Gemeinsamer Ortsvertrag mit kleinem Bewegungsnachweis

**Inhalt:** A1, dazu:
- **Der Bewegungsnachweis** ist ein ausgebautes `auth.gos`-Element, im Spielerrecord gespeichert und damit swipe-stabil (§4.2).
- **Wer ihn liest:** Erzählerzeile, Extractor-Erwartung und Weltprüfung lesen **dieses** Objekt. Keine Stelle bestimmt Ziel, Umfang, Dungeon oder Ebene neu.
- **Was er nicht festlegt:** Er sagt **nicht**, dass Alaric ankommt. Er sagt, welche Ankünfte zulässig wären: das Ziel, Halte auf dem bekannten Weg, der PULSE-Halt auf der Straße und ein neuer Ort im Umfang.
- **Erst prüfen, dann anlegen:** Die Weltprüfung legt einen neuen Ort erst an, wenn die Ankunft zulässig ist.

**Wirkung auf die Proben:**

| Probe | Ergebnis |
|---|---|
| Rogue #80 | ✓ |
| Tannery Rows und Ostrek | ✓ (Ziel `existing` schon beim GO, siehe §4.4 zu Ostrek) |
| `.186` Mage | ✓ (Ziel ist der Dungeon) |
| verwaiste Räume | ✓ |
| Warrior #122 | ✓ (Art nach dem Umfang normalisiert: Stätte unter dem Reich) |
| `.188` Mage | **teilweise** (der Nachweis trägt die Ebene; die Regel „down heißt Ebene+1“ muss Fachplan B lösen) |
| Rogue #62 | **teilweise** (zulässige Ankunft im Umfang; die Raumregel löst B) |

**Entfällt:**
- `scopedPlaces` (beide Aufrufe),
- `arrivalPlace`-Ebenen-Vorprüfung,
- `unseen`/`exploring`/`elsewhere` in `wayRefused`,
- die eigenständige Zielauflösung im World-Applier.

**Kommt hinzu:**
- vier Felder im vorhandenen GO-Objekt,
- ein Prüfaufruf `allowedArrival(step, place)`.

**Bewertung:** größter Gewinn je Aufwand. **Netto weniger** Pfade, wenn die alten Prüfungen nach dem Schattenmodus wirklich entfernt werden.

### A3 – Vollständiger gemeinsamer Bewegungsplan

**Inhalt:** Die Engine berechnet vor der Erzählung einen Plan:
- alle Wege, Hindernisse, Halte und Zeitfenster,
- Bedingungen (Gate, Gebühr, Siegel, Stealth, PULSE),
- Begleiter, Anwesenheit am Ziel.

Erzähler, Extractor und World prüfen gegen den Plan.

**Wirkung:** wie A2, dazu eine feinere Erzählerführung.

**Gegenargumente:**
- **Was schon vorab entschieden ist:** Weg und Halt liefert `wayBetween` in Dungeons bereits; PULSE entscheidet die Reise vorab; Gate und Siegel entscheidet `livingGo`.
- **Wo es sich nicht vorab rechnen lässt:** Überland gibt es kein Wegnetz, und der Kanon §10 schließt eine Pathfinding-Simulation aus. Ein vollständiger Plan wäre dort **erfunden**.
- **Was verdoppelt würde:** die Ankunftsfolgen in `arrive()`, also Zurückbleibende, Begleiter, Fortschritt und Bedingungen, als zweite Planlogik. Das ist die „zweite Plan-Engine“, vor der der GPT-Gegenreview warnt.

**Mehrwert gegenüber A2:** in keinem der Originalfälle belegt.

**Bewertung:** **nicht empfohlen.** Mehr Zustand, mehr Kontext, kein zusätzlicher gelöster Fall.

### A4 – Ortswahl statt Ortsbau

**Kerngedanke:** Der Extractor ist heute Kartograf (Grundanalyse G2). A4 nimmt ihm das Bauen ab.
- **Ankunft ist die Antwort des Bewegungsschritts.** Für jeden Schritt fragt `expected` nur: angekommen? Wenn ja, **wo aus einer kurzen Kandidatenliste**: Ziel, Halte des bekannten Weges, „road“ (PULSE-Halt) oder „new: <Name>“ im Umfang des Schritts. Dazu **an welcher Stelle der Antwort** (Meldungs-`seq`).
- **Was entfällt:** ein eigenes `arrive`-Delta für GO-Schritte. Ein Ortswechsel ohne GO wird nur als `overreach` gemeldet (gibt es schon) beziehungsweise als erzwungener Ortswechsel mit Ursache (`forced_by`, heute im `arrive`).
- **Szene aus der Position:** Meldungen vor der Ankunftsposition gehören zum Ausgangsort, danach zum Ziel. Die Pflicht, jeder Meldung eine Szene beizugeben, entfällt für GO-Züge.
  - Der Schutz für Inhalte eines **unerreichten** Ortes bleibt: Ohne bestätigte Ankunft gelten Meldungen „nach“ dem Aufbruch weiter als unbelegt (`scene_context`).
  - Das ist **nicht** die Freistellung „ortsneutraler“ Typen, die der O1/O2-Gegenreview verworfen hat.
- **Neue Orte ohne Bewegung:** als `place.reported` mit Namen, Art und Umfang aus dem aktuellen Ort, nicht mit frei gewählten Eltern.

**Wirkung auf die Proben:**

| Probe | Ergebnis |
|---|---|
| `.188` Rogue #98 (`expected["2"]`) | ✓ (Antwort nur für vorhandene Schritte; ein zusätzlicher Schlüssel mit `null` ist bedeutungslos und wird verworfen) |
| Chronologie-Reparaturen | 11 von 24 der FOCUS-Stichprobe `.188` [D]; der Großteil entfällt [S] |
| Warrior #122 | ✓ (Eltern aus dem Umfang) |
| Rogue #80 | ✓ (keine Orts-ID nötig) |

**Entfällt:**
- im Vertrag das `arrive`-Delta für GO-Schritte,
- die Regel `TRAVEL` (Teile),
- `TRAVEL CHRONOLOGY`,
- die Ankunftsform von `expected`,
- `arrival_evidence` (`world.js:1717–1720`),
- der `expected`/`arrive`-Abgleich in `sceneIssues`.

**Kommt hinzu:** eine Kandidatenliste je Schritt (wenige Zeilen im Prompt).

**Risiken:**
- **Kanon:** Der Wortlaut von §2 nennt ausdrücklich „`arrive`-Deltas“. Die Semantik bleibt (autorisiert, bestätigt, chronologisch), der Wortlaut ändert sich. Das muss bestätigt werden, ist aber keine neue Spielregel.
- **Replay:** viele Abweichungen, weil die Ankunftsmeldung anders aussieht.
- **Mehrteilige Reisen:** Mehrere Schritte in einer Antwort brauchen je Schritt eine Position.

**Bewertung:** **empfohlen als zweite Stufe nach A2.** Erst wenn A2 im Schattenmodus zeigt, dass der Nachweis die Ankünfte vollständig beschreibt.

### A5 – Ankunft vor der Erzählung für bekannte Ziele (V1, erneut geprüft)

**Neue Daten [D]:**
- 122 von 144 autorisierten Bewegungen kommen heute an.
- Die zehn von der Engine abgelehnten Ankünfte sind Ziel-, Ebenen- oder Raumfragen. Eine Vorabbuchung hätte sie nicht gelöst, sie hätte sie nur früher gemacht.
- 16 von 26 abgelehnten Ankünften entstehen ohne GO.

**Opus-5.5-Befund unverändert:** Es entfällt kein Pfad, und Anwesenheit sowie Preis bleiben der Engpass.

**Bewertung:** **nicht empfohlen.**

---

## 4. Empfohlene Zielrichtung: A2, danach A4

### 4.1 Das Ortsbuch: ein Bestand, vier Sichten, ein Auflöser

**Bestand:** weiter ausschließlich `state.places` aus dem Eventlog. Keine zweite Ortsbank.

| Sicht | Frage | Inhalt | Wer fragt |
|---|---|---|---|
| **existiert** | Gibt es den Ort? | jeder Eintrag in `state.places`, auch verborgene Räume | World intern |
| **bekannt** | Darf ein Modell ihn nennen? | besucht, gesehen, berichtet (`known`), dazu die Abstammung des aktuellen Ortes; **nicht** verborgene, nicht gefundene Räume (`hidden`-Links, `roomKnown`) | Planner-Ziel, Extractor-Schema, Route |
| **beworben** | Was steht im Prompt? | heutige `catalogPlaces`-Auswahl, nur noch Rangfolge und Kürzung | Prompttexte |
| **erreichbar** | Darf er von hier aus dorthin aufbrechen? | Ergebnis der Topologiefunktion (Fachplan B für Dungeons; außerhalb: Siedlung oder Reise) | GO-Handler |

**Auflöser** `resolvePlaceRef(state, ref, { scope, purpose })`, Stufen in fester Reihenfolge:
1. **ID:** bekannte ID → `existing`; existierende, aber nicht bekannte ID → `invalid` (kein Leck verborgener Orte).
2. **Gildenhalle** (`guildDestination`, unverändert).
3. **Dungeon-Gate:** Name oder **Kopfwort** („Grotto“, „Warrens“) eines bekannten Dungeons im Umfang → `existing(gate)`. Mehrere Treffer → `ambiguous`.
4. **Im Umfang:** exakter normierter Name unter den bekannten Orten des Umfangs. Der Umfang ist die aktuelle Stätte und Siedlung samt Kindern; bei einem GO zusätzlich das Reich und die Route.
5. **Im Umfang, Kopfwort:** genau ein bekannter Ort, dessen normierter Name mit dem gesuchten beginnt oder ihn enthält → `existing`; mehrere → `ambiguous`.
   - Nie über Siedlungsgrenzen hinweg.
   - Nie Siedlung gegen eigene Stätte, also kein Treffer von „Ashbridge“ auf „Ashbridge city gate“.
6. **Berichtet im Reich** (heutiges `knownByName`, berichtete Orte).
7. **Neu:** `new(name, kind, parent)`; die Eltern sind die nächste zulässige Ebene im Umfang (`placeParent`). Nur möglich, wenn der Zweck es erlaubt (GO, Meldung eines erreichten Ortes, Bericht).

**Mehrdeutig wird nie still neu:**
- **GO:** eine Rückfrage an den Spieler (`CLARIFY — which: …`).
- **Extractor-Meldung:** eine Ablehnung mit Kandidaten in der Reparaturform.

**Für die Gegenprobe §2.1:**
- Stufe 5 trifft im Rogue-Zustand #81 genau „the Tannery Rows behind …“. „Ashbridge“ ↔ „Ashbridge city gate“ ist durch die Siedlungsregel ausgeschlossen. „Glassmere“ ↔ „Academy gatehouse“ ebenso.
- „the Grotto mouth“ trifft in Stufe 3 genau `loc.glimmerdeep_grotto`.
- Ob Stufe 5 in größeren Läufen falsch zusammenlegt, ist **vor der Umsetzung im Korpus zu zählen** (§6, R-A7).

### 4.2 Der Bewegungsnachweis (Datenvertrag)

Ausbau des vorhandenen `go`-Objekts (`commands.js:636–638`; heute `seq`, `to`, `name`, `hall`, `newName`, `guild_candidate`, `within`, `stop`, `with`, `journey`):

```text
step = {
  seq, from,                         // vorhanden (from implizit: scene.at)
  target: { id } | { new: { name, kind|null, scope } },   // ersetzt to/newName; scope = Elternrahmen
  mode: 'travel' | 'local' | 'dungeon' | 'within' | 'continue',
  enter: { root, level } | null,     // Dungeon und Ebene, einmal bestimmt (ersetzt elsewhere, arrivalPlace-Vorprüfung)
  stops: [id],                       // bekannte Halte auf dem Weg (heute stop, path)
  road: true|false,                  // PULSE-Leg mit offenem Fenster (heute roadLeg/pulseLeg)
  hall, guild_candidate, with, journey   // vorhanden, unverändert
}
```

**Regeln:**
- **Wer erzeugt ihn:** nur der GO-Handler, einmal. Erzählerzeile, `THE WAY`, `KNOWN AT` und `expected` werden **daraus** formuliert.
- **Zulässige Ankunft** `allowedArrival(step, place)` ist genau einer dieser Fälle:
  - `target.id`,
  - ein Element von `stops`,
  - der Straßenhalt (`road`),
  - ein neuer Ort, den der Auflöser mit `scope = target.new.scope` als `new` oder `existing` im Umfang liefert,
  - im Dungeon das, was die Topologie aus Fachplan B für `enter` erlaubt.
- **Nicht zulässig:** ein Ort außerhalb dieser Menge. Dann gilt `passage`/`no_go` wie heute.
- **Was der Nachweis offen lässt:** Er sagt nie, **dass** Alaric ankommt. Die Ankunft bleibt eine bestätigte Meldung (Kanon §2).

### 4.3 Was die World künftig tut

1. Ankunftsmeldung → `resolvePlaceRef(…, { scope: step })` → `allowedArrival` → **danach** anlegen und `arriveThrough` (unverändert).
2. Der Dungeonweg wird **einmal** bestimmt: Die Weltprüfung fragt dieselbe Topologiefunktion wie der GO-Handler, mit demselben `enter`. Keine eigene `elsewhere`-, `unseen`- oder Ebenen-Ableitung aus der Erzählung.
3. **Unverändert:** `scene_context`, `met`, Zurückbleibende, Begleiter, Gildenbedingungen und Zeit.

### 4.4 Orts- und NPC-Identität

- **Der Fall Ostrek** entstand, weil der Ort neu angelegt wurde und `KNOWN AT` ihn deshalb nicht kannte. Mit `existing` beim GO zeigt `KNOWN AT` (`commands.js:692–694`) die bekannten Personen der Tannery Rows einschließlich der Kinderorte. Damit wäre Meister Ostrek in der Abdeckerei sichtbar gewesen.
- **Ergänzung:** `knownAt` betrachtet den Zielort **und seine bekannten Kinder**, nicht nur den Zielort. Heute steht Meister Ostrek an `loc.rendering_shed`, einem Kind.
- **Kein neuer Personen-Namensabgleich.** Personen werden weiter über `enter`, E2-A und die Anwesenheitsregeln wiedererkannt. Ein Namensabgleich für Personen wäre die gefährliche Heuristik, vor der der GPT-Gegenreview warnt.

### 4.5 Entfallende, bleibende und neue Technik

| Bereich | Heute | Mit A2 (+A4) |
|---|---|---|
| Gültige Orts-IDs | 3 Mengen (Katalog-Enum, Zustand, gefilterte Route) | 1 Sicht „bekannt“ |
| Name → Ort | `placeIdentity` (7 Stufen), Namensteil `resolvePlace`, `knownByName`, verstreute `guildDestination`-Aufrufe | 1 Auflöser mit 7 geordneten Stufen und 4 Ergebniszuständen |
| Habitat-/Dungeon-Eltern neuer Orte | `scopedPlaces` zweimal je Antwort | `scope` im Nachweis |
| Dungeonbezug der Ankunft | `elsewhere` (über Namensauflösung), `unseen`/`exploring` | `step.enter` |
| Ebene einer neuen Ankunft | `arrivalPlace`-Vorprüfung, `resolvePlace` `floorRefusal`, `wayRefused` `floorRefusal`/`levelVia` | eine Stelle (Fachplan B) |
| Anlegen | vor der Prüfung (verwaiste Orte) | nach der Prüfung |
| Ankunftsmeldung (A4) | `arrive`-Delta **und** `expected.arrived`, Abgleich `arrival_evidence` und `sceneIssues` | eine Antwort je Schritt mit Position |
| Szene je Meldung (A4) | Pflicht bei jedem Ortswechsel, Reparatur | aus der Ankunftsposition |
| Altpfade (V6) | 9 `!explicitTravel`-Zweige, `lodgedHere`, `implicitArrivals`, `laterLegs`, Ruleset-1-Erwartungsankünfte | entfernt (vorher in `campaignSupport` bestätigt: nicht mehr ladbar) |

**Bleibt unverzichtbar:**
- `no_go` (keine Teleports),
- die Szenenprüfung für Inhalte unerreichter Orte,
- Gate, Gebühr, Kapazität und Siegel,
- PULSE-Reisehalt,
- Zurückbleibende und Begleiter,
- `met` an den bestätigten Schritt gebunden,
- Gildenschalter nur in der erreichten Halle.

**Nettobilanz [S]:**
- **Entfällt:** rund 150–250 Zeilen Logik in `place_refs.js`, `world.js` (`wayRefused` Teil, `arrivalPlace`, `resolvePlace` Namensteil, Altpfade), `catalog.js` und `planner.js:330`; dazu die drei Vertragsbausteine der Ankunft (A4).
- **Kommt hinzu:** rund 80–120 Zeilen für Auflöser und Nachweis.
- **Ergebnis:** Netto weniger, **nur wenn** die alten Prüfungen nach dem Schattenmodus entfernt werden. Diese Bedingung ist Teil der Abnahme.

### 4.6 Performance [D][S]

| Größe | Heute | Erwartung | Nachweis |
|---|---|---|---|
| Modellaufrufe je Zug | 3 + Reparaturen | gleich | – |
| Extractor-Reparaturen | `.188`: 42 von 195 Extraktionen; davon in der FOCUS-Stichprobe 16 von 24 ortsbezogen (11 Chronologie, 5 Ortsreferenz, 2 `expected`) | A2: Ortsreferenz −; A4: Chronologie und `expected` weitgehend − [S]. Die Reparaturen machen heute 8,1 % der Tokens aus; ortsbezogen etwa 4–5 % [S] | Budgetwerkzeug über einen kurzen natürlichen Lauf |
| Prompt | Extractor ~14,8k Tokens; Ankunftsvertrag (Regel `TRAVEL`, `TRAVEL CHRONOLOGY`, `arrive`, Ankunftsform von `expected`) ~1,6k Zeichen | A4: davon der größere Teil entfällt, eine Kandidatenliste (~0,2–0,5k) kommt dazu [S] | Promptgröße je Rolle messen |
| Schema-Enum | Katalogausschnitt | Sicht „bekannt“ (in den Läufen 30–42 Orte); das Enum steht **nicht** im Prompt | – |
| Latenz | – | unverändert bis leicht besser (Reparaturen) | p50/p95 je Spielzug |
| Fold und Persistenz | – | gleiche Eventtypen (`place.created`, `scene.moved`); der Nachweis liegt im Spielerrecord wie heute `auth.gos` | Replay, Reload |

### 4.7 Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Kopfwortabgleich legt verschiedene Orte zusammen | Umfang, Siedlungsgrenze, „Siedlung ≠ eigene Stätte“, Mehrdeutigkeit als Rückfrage; Korpuszählung vor dem Umschalten |
| Sicht „bekannt“ enthält zu viel, Verborgenes wird angeboten | „bekannt“ schließt verborgene, ungefundene Räume ausdrücklich aus; ein Test mit verborgenem Raum |
| Ein falscher Nachweis ist jetzt überall gleich falsch | Schattenmodus: Nachweis und heutige Prüfung laufen parallel über Korpus und Regressionen, jede Abweichung wird begründet |
| `arrive()` als Closure über `applyWorld` | A2 ändert `arrive()` nicht; nur die Zulässigkeitsprüfung davor |
| A4 ändert Vertrag und Replay stark | erst nach A2; Replay-Abweichungen einzeln freigeben |
| Alte Kampagnen | `campaignSupport` lehnt sie schon ab; Altpfade erst nach dieser Bestätigung löschen |

---

## 5. Regressionen

**Rot vor der Änderung und grün danach, am Original:**

| # | Fall | Erwartung |
|---|---|---|
| R-A1 | `.188` Rogue #79/#80 (Chat bis #79, Original-Extractorantwort n121) | die Antwort wird übernommen, Ostrek `present:false` am bestehenden Ort |
| R-A2 | `.188` Rogue #81/#82 | GO `{new:"the tannery rows"}` → `existing(realm.duskreach.the_tannery_rows_…)`; Ankunft dort; **kein** neuer Ort; `KNOWN AT` nennt Meister Ostrek |
| R-A3 | `.186` Mage #63/#64 | GO „the Grotto mouth“ → Gate von Glimmerdeep; Ankunft im ersten Teil gemäß Dungeonregeln; kein `elsewhere` |
| R-A4 | `.186` Mage #64 abgelehnt (Gegenstück) | eine **abgelehnte** Ankunft legt keinen Ort an |
| R-A5 | `.186` Warrior #121/#122 | Wachhaus als Stätte im Umfang, nicht abgelehnt |
| R-A6 | `.188` Rogue #98 (A4) | Antwort mit überzähligem `null`-Schlüssel gilt; die Ankunft in der Halle wird gebucht |

**Gegenfälle, die unverändert bleiben müssen:**

| # | Fall |
|---|---|
| R-A7 | verschiedene Orte mit Präfixnamen (Stadt ↔ Tor, Glassmere ↔ Torhaus, „cellar“ in zwei Häusern) bleiben getrennt; mehrdeutig → Rückfrage |
| R-A8 | verborgener, ungefundener Dungeonraum ist weder Planner-Ziel noch Extractor-Referenz |
| R-A9 | Ankunft ohne GO → `no_go`, Kaskade wie heute |
| R-A10 | GO zu bekanntem Ort, Erzählung kommt nicht an → keine Bewegung |
| R-A11 | PULSE-Straßenhalt (`.181`): Halt gebucht, Ziel nicht erreicht |
| R-A12 | erzwungener Ortswechsel mit Beleg (`forced_by`) |
| R-A13 | neue Gildenhalle in neuer Siedlung (`guild_candidate`), Schalter nur nach Ankunft |
| R-A14 | Gate mit Gebühr und Kapazität, versiegelte Ebene |
| R-A15 | Habitat-Erkundung `within` mit Jagdcredit |
| R-A16 | Begleiter kommen mit, Zurückbleibende bleiben |
| R-A17 | `met` nur am bestätigten Schritt |
| R-A18 | Save/Reload, Swipe des Erzählers, Regenerate: der Nachweis bleibt im Spielerrecord, die Ankunft hängt an der jeweiligen Antwort |

---

## 6. Umsetzungsstufen und Abnahme

| Stufe | Inhalt | Abnahme |
|---|---|---|
| A-S0 | Messwerkzeug „Ortsvorfälle“: abgelehnte Ankünfte nach Klasse, verwaiste Orte, Duplikatkandidaten nach Umfang und Präfix, Ankünfte je Schrittart | reproduziert die Zahlen dieser Pläne für `.186`/`.188` |
| A-S1 | Auflöser und Sicht „bekannt“; Schema und Route daran; Sonderregeln entfernen | R-A1, R-A2 (ohne Nachweis: nur Planner-Seite), R-A7, R-A8; Korpus: Abweichungen nur bei vorher abgelehnten gültigen IDs |
| A-S2 | Bewegungsnachweis im **Schattenmodus**: berechnen, protokollieren, mit der heutigen Prüfung vergleichen | Liste aller Abweichungen im Korpus, jede begründet |
| A-S3 | Umschalten; `scopedPlaces`, `elsewhere`/`unseen`, `arrivalPlace`-Vorprüfung, Altpfade entfernen; Anlegen nach Prüfung | R-A3–R-A5, R-A9–R-A18; Nettozeilen negativ |
| A-S4 | A4: Ankunft als Schrittantwort, Szene aus Position | R-A6; FOCUS-Reparaturen Chronologie und `expected` im kurzen natürlichen Lauf halbiert |

**Messbare Ziele:**

| Kennzahl | heute | Ziel |
|---|---|---|
| Autorisiertes GO, dessen Ankunft wegen Ziel, Umfang oder Hierarchie abgelehnt wird | `.186`/`.188`: Rogue #62, Warrior #122, `.186` Mage 5×; Ebenenfälle → B | 0 |
| Verwaiste Orte | 6 | 0 |
| Doppelte Orte und NPCs im Endzustand | Tannery Rows/Ostrek | 0 |
| Präfix-Zusammenlegungen verschiedener Orte | – | 0 |

---

## 7. Kanon und Entscheidungen

- **A1–A3:** keine Kanonänderung. Eine **technische Autoritätsregel** gehört in die Patchnote: „Ziel, Umfang, Dungeon und Ebene einer Bewegung bestimmt einmal der GO-Handler; die Ankunft bleibt eine bestätigte Meldung.“
- **A4:** Präzisierung des Wortlauts von Kanon §2 („`arrive`-Deltas“ → „bestätigte Ankunftsantwort des autorisierten Schritts“). Die Semantik bleibt gleich; die Präzisierung braucht trotzdem deine Bestätigung.
- **Rückfrage bei mehrdeutigem GO-Ziel:** passt zu §1 („keine zusätzlichen Pflichtbestätigungen“) nur, wenn sie selten bleibt. Messgröße für A-S1.

**Offen für Fachplan B:**
- die Topologiefunktion und die Ebenenregel, die `step.enter` speist,
- die Raumregel außerhalb echter Dungeons (Rogue #62).

**Offen für Fachplan C:** Bewegungen ohne GO, `move` gegen `go`, Rückwege.
