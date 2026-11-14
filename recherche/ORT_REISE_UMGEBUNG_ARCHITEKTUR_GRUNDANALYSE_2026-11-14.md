# Avereth – Grundanalyse des Orts-, Reise- und Umgebungssystems

**14.11.2026 · Claude · Architekturstudie, ergebnisoffen, keine Implementierung.**

> **Nachtrag nach Selbstprüfung (14.11.2026):** Einzelne Zahlen und Empfehlungen wurden durch den [GPT-Gegenreview](ORT_REISE_UMGEBUNG_GPT_GEGENREVIEW_2026-11-14.md) und die Fachpläne [A](FACHPLAN_A_ORTSBUCH_BEWEGUNGSPLAN_2026-11-14.md), [B](FACHPLAN_B_DUNGEONRAUM_ARCHITEKTUR_2026-11-14.md) und [C](FACHPLAN_C_BEWEGUNGSARTEN_ERZAEHLKONTINUITAET_2026-11-14.md) präzisiert oder ersetzt. Die Stellen sind im Text markiert; die Übersicht steht in [§12](#12-nachtrag-korrekturen-nach-selbstprüfung).

**Prüfstand:** Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`, Build `4.3.0-c.6.6.189`, HEAD `4438241`. Zeilenangaben beziehen sich auf `avereth-engine/` bei diesem Stand. Dokumentation auf `main` bei `cb5b842`.

**Nachweisgrade:**

| Kürzel | Bedeutung |
|---|---|
| **[C]** | am Code von `4438241` gelesen (Datei und Zeile genannt) |
| **[D]** | aus Originaldaten gezählt; Skripte nur lesend |
| **[R]** | isolierte Gegenprobe mit der Engine (Fold, Katalog, Replay) |
| **[H]** | aus Git-Historie oder Patchnote belegt |
| **[S]** | Schätzung aus den Daten, Rechenweg genannt |
| **[P]** | plausible Hypothese, nicht gemessen |

**Datengrundlage:**
- **Natürliche Läufe:** beide letzten Dreierbatches vollständig, also `.186` (`npc-20261114-094810Z`) und `.188` (`npc-20261114-161005Z`). Je drei Chats mit gespeicherten Records, `calls.json` und den FOCUS-Modellaufrufen der Nutzer-Auszüge.
- **Replay-Korpus:** neu erzeugt mit `.189` (10 Läufe b16–b19, 2235 Fälle). Er spielt **alte** Modellantworten gegen den heutigen Code und ist deshalb nur bedingt vergleichbar.
- **Frühere Analysen:**
  - [Fable-Audit](ARCHITEKTUR_AUDIT_10B_FABLE.md) und [Opus-5.5-Gegenreview](ARCHITEKTUR_GEGENREVIEW_10B_OPUS55.md) (V1),
  - [Fachplan O1/O2](FACHPLAN_O1_O2_KAUSALITAET_UND_TEILBEWEGUNG.md),
  - Reviews `.179`, `.183`, `.186`, `.188`,
  - [Kanon](../02_DESIGN_KANON.md).

**Nicht gemacht:** keine Produktänderung, kein Modellaufruf, keine Testsuite. Frühere Urteile werden neu geprüft, nicht übernommen.

---

## 1. Kurzantwort

1. **Das Grundproblem ist nicht der Zeitpunkt der Ankunft, sondern dass niemand den Ort besitzt.**
   - **Vier Urteile:** Planner-Befehl, Befehlsprüfung, Erzählung, Extractor-Meldung.
   - **Drei Topologieprüfungen:** Befehlsseite, Weltseite, Dungeonebene.
   - **Mindestens fünf verschiedene Mengen „gültiger Orte“.**
   
   Konsistenz entsteht nur durch nachträgliche Gegenprüfungen, und jede neue Unstimmigkeit erzeugt eine weitere Prüfung.
2. **Der Extractor ist heute der Kartograf der Welt.** Name, Art, Eltern, Ebene und Durchgang eines Ortes entstehen aus einer Nachmeldung. Die Engine erkennt einen Ort über Namensgleichheit und eine Eltern-Heuristik wieder.
   - Daraus entstehen doppelte Orte. Bei Personen, die an diesen Orten hängen, entstehen doppelte NPCs.
   - Ein besuchter Ort wird bei Namensgleichheit **bewusst nicht** wiedergefunden.
3. **Das Befehlsmodell kennt nur „eigenes GO“ und „Band-Schritt im Kampf“.** Es fehlen:
   - **Mitgehen:** Ein NPC führt, Alaric hat zugestimmt oder es vorgeschlagen.
   - **Teilbewegung einer gewählten Handlung:** Der Kanon §3 erlaubt sie ausdrücklich, die Engine kennt sie nicht.
   
   Das ist die größte Quelle unautorisierter Ankünfte.
4. **Der Ort ist der Primärschlüssel fast aller Teilsysteme:** Anwesenheit, `KNOWN AT`, `met`, E3, PULSE-Rahmen, Jagdcredit, Angebote, Schalter, `scene_context`. Eine einzige Ortsunstimmigkeit verwirft deshalb typischerweise 5–10 weitere Meldungen.
5. **Die Korrektur verliert gegen den angezeigten Text.** Der Erzähler sieht seine falsche Szene im Verlauf, der Spieler hält sie für wahr. Die Korrektur ist ein Satz in einem späten Systemblock.
6. **Der Handel wurde stabil, weil er auf einen Schreiber, typisierte Zustände und Engineentscheidungen vor der Erzählung umgestellt wurde.** Das Ortssystem hat diese Umstellung nie erfahren. Seine Reparaturen bleiben additiv.

**Empfehlung (§8):** ein gezielter Umbau ohne Neuerfindung der Reise, in drei Stufen.
- **Ohne Kanonänderung:** ein gemeinsames **Ortsbuch** (eine Ortsmenge, ein Auflöser, eine Hierarchieregel) und ein **Bewegungsplan**, den Befehl, Erzählerzeile, Extractor-Erwartung und Weltprüfung gemeinsam lesen.
- **Nach Designentscheidung:** ein **engine-erzeugtes Raumnetz für Living Dungeons** und zwei neue **Bewegungsarten** (Mitgehen, Teilbewegung).
- **Nicht empfohlen:** die vollständige Vorabbuchung jeder Reise und das Abschaffen der Innenräume.

Der Umbau lohnt sich: In beiden letzten natürlichen Batches entfiel fast **die Hälfte aller Weltablehnungen** auf diesen Bereich. **Beide Dungeon-Expeditionen des Magiers** scheiterten an Widersprüchen der Engine selbst; die von `.186` blieb in zwei Reviews unbemerkt.

---

## 2. Bestandsaufnahme: die Kette vom Spielerwort bis zum gespeicherten Ort

### 2.1 Wer entscheidet was [C]

| Stufe | Komponente | Entscheidet | Ortswissen | Code |
|---|---|---|---|---|
| 1 | **Planner** (LLM) | ob die Nachricht eine Bewegung ist; Ziel als ID, `{new: Wörter}` oder `within` | Katalog (`PLACES`, `RECENT ROUTE`), Regel 7a–7c | `planner.js` (Regeln 7a–7c, `mapPlan`, `retreatGo` 743, `BACK_WAY` 741, `STAYS` 764) |
| 2 | **Befehlsprüfung** | Autorisierung, Gildenziel, Dungeonweg, Erkundung, Gate, Kapazität, Stealth, Reiseleg, PULSE-Anspruch, Falle, Wegzeile, Vorhaben, `KNOWN AT` | **alle** Orte im Zustand (`commands.js:628`), eigene Wegsuche | `go` `commands.js:592–699`, `dungeonGo` 421, `livingGo` 475 |
| 3 | **PULSE** | vorab: ob unterwegs etwas geschieht | Reiserahmen | `pulse.js` |
| 4 | **Erzähler** (LLM) | ob und wo Alaric ankommt, wer da ist, was dort geschieht | Engineblock, Verlauf seiner früheren Antworten | Kontext `context.js` |
| 5 | **Extractor** (LLM) | `arrive`, `expected.<seq>.arrived/at/with/met`, Szene je Meldung, neue Orte mit Art und Eltern, Durchgänge | **Katalogausschnitt** als Schema-Enum (`extract.js:39`, `catalog.js:411`) | Vertrag `content/deltas.json` |
| 6 | **Vorprüfung** | Chronologie (`sceneIssues`), Reparaturaufruf | Startszene | `extract.js:419` |
| 7 | **Firewall** | `no_go` (Ankunft ohne GO) | – | `firewall.js:410–417` |
| 8 | **World-Applier** | Ortsauflösung, Topologie, Weg, Ebene, „anderer Dungeon“, Szenenkaskade, `met`, Gildenbedingungen, Mindestzeit | **alle** Orte, eigene Wegsuche, eigene Ebenenregel | `world.js:1060–1110`, `2420–2570`, `arrive()` `2644–2781` |
| 9 | **Kontext nächster Zug** | Korrekturtext, `KNOWN PEOPLE`, Szene | Zustand | `context.js:871` (höchstens 4 Korrekturen à 400 Zeichen) |

**Allein der GO-Handler** erledigt in 107 Zeilen 14 getrennte Belange:
- Gildenreise, Gildenziel, Namensauflösung, Dungeon-Gate-Schritt, Dungeonweg, Erkundung, Habitat-Grenze,
- Zeitkappe, Living Dungeon, Stealth, Questreise, Reiseleg/PULSE, Falle, Vorhaben und `KNOWN AT`.

### 2.2 Fünf Mengen „gültiger Orte“ [C]

| Menge | Gebraucht von | Definiert durch |
|---|---|---|
| **M1 beworbene Orte** | Planner-Text, Extractor-Text | `catalogPlaces` (`catalog.js:95–139`): Ausgänge, Dungeon-Route, **nur aktive** Jagdorte (110–112), Eltern, Kinder, Geschwister, Siedlung, Halle, 6 neueste Erzählorte der Siedlung, 4 Siedlungen, 2 Dungeons, 4 berichtete Orte |
| **M2 Planner-Ziel gültig** | GO-Handler | jeder Ort im Zustand (`commands.js:628`) |
| **M3 Extractor-Referenz gültig** | Schema | `here` + M1 als Enum (`extract.js:39–44`) |
| **M4 Weltreferenz gültig** | World-Applier | jeder Ort im Zustand, plus Auflösung `{new}` über `placeIdentity` |
| **M5 Route** | Planner („back“, „return“) | `routePlaces` **gefiltert auf M1** (`planner.js:330`) |

M1 ist ein Werbeausschnitt, wird aber als Gültigkeitsgrenze (M3, M5) benutzt. Der Kontext nennt zugleich IDs außerhalb von M1, zum Beispiel `COMPLETED TODAY … at <Jagdort-ID>`.
- **Folge in `.188`:** Rogue #80 scheitert terminal an einer realen, zweimal besuchten Orts-ID.
- **Folge in `.188`:** Bei #81/#82 legt die Engine den Ort ein zweites Mal an, dazu einen zweiten NPC.

### 2.3 Drei Topologieprüfungen [C]

| Prüfung | Stelle | Regel | Widerspruch zur anderen |
|---|---|---|---|
| **T1 Befehlsseite** | `dungeonGo` `commands.js:421–470` | bekannter Raum ohne Weg und ohne Verbindungen → `explore`, autorisiert; das Ziel wird `{new: Raumname}` (625–626); Erzählerzeile „a stair, a door, a passage“ (697) | – |
| **T2 Weltseite** | `world.js:2455–2475` | Ankunft nur, wenn der Ort in dieser Antwort neu ist oder `exploring` und **nicht** bekannt; sonst `wayBetween`; Raum eines anderen Dungeons nur, wenn das GO zu diesem Dungeon aufbrach (`elsewhere`, über `placeIdentity` des GO-Namens) | lehnt ab, was T1 erlaubt hat: ein bekannter berichteter Raum ist nicht `unseen`; ein GO `{new:"the Grotto mouth"}` „brach nicht zu Glimmerdeep auf“ |
| **T3 Ebene** | `levelVia` `dungeon.js:358–363`, `floorRefusal` 415–422 | ein Durchgang „down“ heißt Ebene+1; eine nicht existierende Ebene wird abgelehnt | widerspricht der Erzählerzeile von T1 („a stair“) und der `DUNGEON AHEAD`-Zeile („a part of level 1“) |

### 2.4 Der Ort als Schlüssel aller Teilsysteme [C]

Was ein `scene.moved` (`world.js:2675`, `reset_present: true`) oder sein Ausbleiben bestimmt:
- **Anwesenheit:** Zurückbleibende, Begleiter.
- **`KNOWN AT`, `met`:** E2-A-Wiederanwesenheit (`world.js:2148`).
- **E3:** `LATER ENCOUNTER` aus der Anwesenheitsspanne.
- **PULSE:** Rahmen innen, Straße oder Wildnis; Dach.
- **Jagd:** Credit über die Populationsabstammung.
- **Handel:** Angebote am Ort, `PAID HERE`.
- **Gilde:** Schalterbearbeiter, Gildenbedingungen `arrive_guild_hall`.
- **Dungeon:** Slots und Fortschritt.
- **Meldungen:** `scene_context` für jede Meldung ohne Szene (`world.js:1066`, `1074`).

### 2.5 Erzählerkontext [D]

Aufbau des Narrator-Requests Warrior Turn 56 (`.188`, n172):
- **Systemblöcke:** 2,2k + 2,3k + **35,9k** (Regeln) Zeichen.
- **Verlauf:** fünf Spieler- und Erzählerzüge **wörtlich**, darunter die falsche Szene von #110.
- **Engineblock:** 6,3k, erst danach. Die Korrektur ist **ein** Spiegelstrich direkt vor `PLAYER ACTIONS`.

Die Spieler-LLM des Runners sah im Rohpanel nur `ENGINE REFUSED 6 reported changes (no_go, scene_context): see #audit`. **Korrektur:** Ein menschlicher Spieler sieht in SillyTavern nicht einmal das. `playerFacingLines` (`host.js:453–475`) filtert genau diese Zeile aus dem sichtbaren Panel; nur das HUD nennt den Ort.

---

## 3. Messbild

### 3.1 Ablehnungen [D][R]

| | `.186` natürlich | `.188` natürlich | Korpus b16–b19 mit `.189` |
|---|---|---|---|
| Erzählantworten | 173 | 195 | 1032 |
| Meldungen übernommen / abgelehnt | 651 / 151 (18,8 %) | 894 / 196 (18,0 %) | 3530 / 552 (13,5 %) |
| davon **Ortsprimär** (`no_go`, `passage`, `place`, `area`, `road`, `shut_in`, `dungeon_presence`) | 11 | 16 | 19 |
| davon **Ortsfolge** (`scene_context`, `met_without_arrival`, `met_not_known_here`) | 50 | 79 | 79 |
| **Ortsanteil an allen Ablehnungen** | **40 %** | **48 %** | 18 % |
| davon Folgeablehnungen (Kaskade) | 50 von 61 | 79 von 95 | 79 von 98 |
| Antworten mit Ortsablehnung | 17 (10 %) | 34 (17 %) | 35 (3 %) |

Der Korpus beruht auf älteren Personas und Verträgen mit wenig NPC-Begleitung. Die natürlichen Läufe der aktuellen Personas zeigen den heutigen Stand.

### 3.2 Autorisierte Bewegungen [D]

| Ausgang | `.186` | `.188` | Summe |
|---|---|---|---|
| Spielerzüge mit autorisiertem GO / Fortsetzung | 61 | 83 | 144 |
| angekommen | 49 | 73 | **122 (85 %)** |
| keine Ankunft gemeldet (Halt oder Erzählung blieb) | 5 | 5 | 10 |
| **Ankunft von der Engine selbst abgelehnt** (`passage`, `place`) | 6 | 4 | **10 (7 %)** |
| Extraktion gescheitert | 1 | 1 | 2 |
| GO zu bekannter ID / zu `{new}` / mit `within` / `journey.continue` (korrigiert) | 35 / 24 / 1 / 1 | 41 / 28 / 6 / 8 | **76 / 52 / 7 / 9**: neue Ziele 52 von 135 GOs (39 %), mit `within` 59 |

**Folgerung:** Der Normalfall „autorisiert und angekommen“ funktioniert. Eine Vorabbuchung bekannter Ziele würde vor allem die 85 % beschleunigen, die heute schon gelingen. Das Problem sitzt in den Rändern.

### 3.3 Alle 26 abgelehnten Ankünfte nach Ursprung [D]

| Klasse | Fälle | Belege (Run Chat-#) |
|---|---|---|
| **K1 Engine widerspricht sich selbst** (GO autorisiert, Ankunft von einer anderen Engineregel abgelehnt) | **10** | Topologie (T2/T3), 9 Fälle: `.186` Mage #64, #66, #68, #74, #76 („lies in Glimmerdeep Grotto, where he did not set out for“); `.188` Rogue #62 („no open way from the rope-walk“), Mage #92, #96, #100 („level 2 does not exist“, „no open way“). Hierarchie, 1 Fall: `.186` Warrior #122 („a interior cannot lie in Duskreach“, Eltern vom Extractor) |
| **K2 Teilbewegung einer gewählten Handlung** | 4 | `.186` Rogue #76 (Durchquerung → Grotto), #98 (Händler suchen → Schmiede); `.188` Mage #58 (Verkauf → Apotheke), Rogue #122 (Hinterzimmer → Halle) |
| **K3 Planner verfehlt eine klare Bewegung** | 3 | `.186` Warrior #118 (`move` fiel zur Fiktion), Rogue #56 (Flucht durch die Spalte, `[]`); `.188` Mage #122 („I'm heading back to the Guild hall“, `[]`) |
| **K4 Vorschlag oder Einladung, NPC führt** | 2 | `.188` Warrior #110, Rogue #76 |
| **K5 Erzähler bewegt ohne jeden Bewegungsbezug** | 2 | `.188` Warrior #138 (Wache), Rogue #8 (Frage nach dem Weg) |
| **K6 Folgefehler einer gescheiterten Extraktion** | 1 | `.188` Rogue #100 (nach #98 `expected.2`) |
| **K7 Wiederholung derselben unerreichten Szene** | 4 | `.186` Warrior #120; `.188` Warrior #112, Rogue #78, Mage #60 |

Dazu kommen zwei **Ortsidentitätsfehler ohne abgelehnte Ankunft**: `.188` Rogue #80 (gültige ID nicht referenzierbar) und #82 (doppelter Ort und doppelter NPC).

**Dauer der Widersprüche:**

| | `.186` | `.188` |
|---|---|---|
| Antworten mit abgelehnter Ankunft in Folge (Untergrenze) [D] | 7 Episoden / 11 Antworten | 12 Episoden / 16 Antworten |
| Rekonstruierte Antworten, in denen Erzählung und Engine den Ort verschieden sahen [S] | rund 20 (≈ 10 % der Eingaben), u. a. Warrior #117–#130 und Mage #63–#82: die **ganze** Grotto-Expedition nur erzählt, in keinem Review erkannt | rund 20, u. a. Mage #91–#102 |

### 3.4 Kosten [D][H][S]

| Größe | Wert |
|---|---|
| Reparaturaufrufe gesamt | `.186` 52 / `.188` 45 Aufrufe; **8,1–8,2 % der Tokens**, 4–5 % der Modellzeit |
| davon ortsbezogen (FOCUS-Stichprobe `.188`, 24 Extractor-Reparaturen) | **16 von 24**: 11 Chronologie, 5 Ortsreferenz, 2 `expected`; in `.186` waren die Reparaturen fast nur Leerantworten |
| Extractor-Vertrag `deltas.json` | 22 von 47 Regeln mit Ortsbezug (12,5k von 19,9k Zeichen); Ortsmeldungstypen 4,7k; `expected` 2,6k. Rund **40 %** des Vertragstexts [S] |
| Erzählerregeln | 51 von 258 Absätzen (14,6k von 35,9k Zeichen) erwähnen Reise oder Ort (Obergrenze) |
| Code mit Ortsbegriffen | `world.js` 326 von 3454 Zeilen, `commands.js` 171 von 1848, zehn weitere Module mit 10–52 Zeilen; `dungeon.js` (423), `living.js` (953), `place_refs.js` (92), `known.js` (95), `settlement.js` (173), `intents.js` (113) überwiegend |
| Ablehnungsregeln mit Ortsbezug | `world.js`: `place` 6×, `passage` 5×, `scene_context` 2×, `area` 2×, `shut_in` 2×, `road`, `dungeon_presence`, `dungeon_slot`, `met_without_arrival`, `met_not_known_here`, `time_cap`; Firewall `no_go` |
| Commits mit Ortsbezug im Titel | 137 von 769 (18 %); September 40, Oktober 69, 1.–14. November 24 |
| Tests mit Ortsbezug | 101 Dateien, 1306 von 2813 Testfällen berühren `arrive`, `go`, `no_go`, `scene_context` oder `passage` (Obergrenze) |
| Builds an der Ankunftsnaht seit `.74` [H] | Fable zählte 18 bis `.177`; seither `.181`, `.187`–`.189` |

---

## 4. Ursachenmatrix

| Fehlerbild | Wo es entsteht | Unmittelbare Ursache | Architekturursache | Folgeablehnungen |
|---|---|---|---|---|
| Dungeon-Expedition nur erzählt (`.186`, `.188` Mage) | T1 erlaubt, T2/T3 lehnen ab | Erkundung über `{new}`, `elsewhere` über Namensauflösung, „down“ heißt Ebene+1 | **G1** drei Topologien; **G2** Räume und Durchgänge aus Nachmeldung | `scene_context`, `TARGET NEEDED` |
| Besuchter Ort nicht referenzierbar (`.188` Rogue #80) | Schema-Enum M3 | Jagdorte nur bei aktivem Auftrag in M1 | **G1** Werbeausschnitt als Gültigkeitsgrenze | ganze Extraktion verloren |
| Doppelter Ort, doppelter NPC (`.188` #82) | `placeIdentity`, Personenauflösung | Name und Eltern weichen ab; besuchte Orte bei Namensgleichheit ausgeschlossen (`place_refs.js:34–43`); `npc.meister_ostrek` in keinem Kontext | **G2** Identität aus Nachmeldung; **G4** Personen hängen am Ort | dauerhaft |
| Habitat-Geschwister statt -Kind, kein Credit (`.179`-B) | Extractor-Eltern, `placeParent` | Eltern frei gewählt | **G2** | `population`, kein Credit |
| PULSE-Halt ohne Ort (`.179` P2-2, behoben `.181`) | Extractor meldet kein `arrive` | Reise endet ohne Ort | **G1** Ankunft nur aus Meldung | 51 Eingaben |
| Ankunft ohne GO bei Arbeit, Begleitung, Handel (Batch 28: 8 von 18; `.188` K2/K4) | Planner (regelgerecht), Erzähler | kein Befehl für Mitgehen oder Teilbewegung | **G3** Befehlsmodell zu schmal | `no_go` + Kaskade |
| `move` statt `go` (`.186` #117) | `mapPlan` | Band-Schritt ohne Wirkung wurde Fiktion | **G3** Überlappung `move`/`go`; Reparatur über Wortlisten (`.187`–`.189`) | `no_go` + Kaskade |
| Szene wird wiederholt (K7) | Erzähler | falsche Szene im Verlauf, Spielernachricht spricht Personen dort an | **G5** Korrekturkanal | erneut `no_go` |
| Ein Formfehler verwirft die Ankunft (`.179`-C, `.188` #98) | Extractor | ganze Antwort ungültig | **G1** Ankunft hängt an einer Meldung | Ankunft verloren |
| Chronologie-Reparaturen (11 von 24 FOCUS) | `sceneIssues` | Meldungen vor der Ankunft ohne Szene | **G1** Szene je Meldung statt aus dem Bewegungsplan | Reparaturkosten |
| `invalid local habitat scope` (Korpus 10×, `.188` Mage #109) | GO-Handler | `within` außerhalb des Habitats | **G3** Sonderart ohne klare Grenze | Folgebefehl `needs step 1` |

---

## 5. Gesamtdiagnose

**G1 – Niemand besitzt den Ort.** Planner, Befehlsprüfung, Erzähler und Extractor urteilen je für sich. Engine-seitig gibt es fünf Ortsmengen und drei Topologieprüfungen (§2.2, §2.3). Jede Gegenprüfung ist für sich richtig. Der Fehler entsteht in der Summe; das ist das Kennzeichen einer Zuständigkeitsfrage. Zehn von 26 abgelehnten Ankünften sind reine Widersprüche der Engine mit sich selbst.

**G2 – Der Extractor ist Kartograf.**
- **Was die Nachmeldung festlegt:** 40 von 52 (`.186`) und 49 von 61 (`.188`) neuen Orten stammen aus der Nachmeldung einer Antwort (`by: reply`). Name, Art und Eltern wählt das Modell. In Dungeons gilt das auch für Räume und Durchgänge; die Engine leitet daraus Ebenen ab.
- **Wie wiedererkannt wird:** `placeIdentity` (`place_refs.js:17–44`) kennt sieben Auflösungswege: `here`, ID, Gildenziel, Dungeon-Gate, Eltern-Aufstieg, Dungeonraum nach Name, Eltern plus Name, nur berichtete Orte im Reich, Aliase berichteter Orte.
- **Die bewusste Lücke:** Ein **besuchter** Ort mit gleichem Namen unter anderem Elternteil wird **nicht** gefunden. Das schützt gegen falsche Gleichsetzung und erzeugt Duplikate.

**G3 – Das Befehlsmodell ist zu schmal.**
- **Was es kennt:** eigenes GO (`go`), Band-Schritt (`move`) und `within` (lokale Jagderkundung).
- **Was fehlt:**
  - Mitgehen nach Zustimmung oder Vorschlag (K4; Batch 28 „Arbeit, die eine Person anführt“ 8 von 18).
  - Teilbewegung als Teil einer gewählten Handlung (K2; Kanon §3: „Gewöhnliche Teilbewegungen einer gewählten Handlung sind zulässig“).
- **Wie bisher repariert wurde:** über Wortlisten an anderer Stelle (`BACK_WAY`, `STAYS`, `.187`–`.189`) und über Prompts. Das ist genau das Muster U3 aus dem Fable-Audit, das im Handel abgebaut wurde.

**G4 – Der Ort ist der Primärschlüssel.** Weil Anwesenheit, Wissen, Jagd, Handel, Gilde und Dungeon am Ort hängen, bleibt eine Unstimmigkeit nie lokal. Die Kaskade ist eine korrekte Folgeablehnung und kein eigener Fehler. Sie verwandelt aber eine Ortsfrage in verlorenen NPC- und Weltinhalt: 50 bzw. 79 Folgeablehnungen.

**G5 – Die Korrektur verliert gegen den Text.**
- **Was Erzähler und Spieler sehen:** Der Erzähler sieht seine falsche Szene als Verlauf, die Spieler-LLM sieht sie als Geschichte.
- **Was die Engine dagegensetzt:** einen Satz im Engineblock, bei langen Ortsnamen auf 400 Zeichen gekürzt (`context.js:871`), und ein kryptisches Panel.
- **Was in `.188` geschah:** Die benannte Korrektur von `.187` wurde befolgt; der Erzähler begann am richtigen Ort. Dann wiederholte er die Reise, weil der Spieler Personen am unerreichten Ort ansprach.

**G6 – Additive Reparatur, stille Verluste.**
- **Wie repariert wird:** Neue Regeln kommen dazu, alte entfallen selten. Die Zimmerausnahme `lodgedHere` ist seit `.99` für alle aktuellen Kampagnen abgeschaltet und steht weiter im Code (`world.js:121`, `firewall.js:411`).
- **Was Reviews finden:** einzelne Ablehnungen. Ganze verlorene Segmente bleiben unsichtbar, weil jede Einzelablehnung regelkonform ist. Die `.186`-Grotto-Expedition des Magiers fiel weder dem GPT-Review noch dem Opus-Gegenreview auf.

**Vergleich mit dem Handel:** Der Handel ist stabil geworden, weil `.142`–`.185` vier Dinge eingeführt haben:
- einen Schreiber (`offer.accept`, `#pay`),
- gespeicherte Zustände (fest, bedingt, `PAID HERE`),
- Entscheidungen vor der Erzählung (Buchung am Antwortende, bekannt vor der nächsten),
- weniger Wortlisten.

Das Ortssystem bekam stattdessen weitere Prüfungen und Korrektursätze.

**Was frühere Analysen richtig und falsch sahen:**
- **Fable U1 („Zeitpunkt der Autorität“)** trifft einen Teil. Opus 5.5 hat zu Recht gezeigt, dass die Vorabbuchung bekannter lokaler Ziele (V1-eng) wenig bringt. Die neuen Daten bestätigen das: 85 % kommen ohnehin an.
- **Bisher übersehen:** dass die **Engine sich selbst widerspricht** (K1), dass **Ortsidentität** (G2) und **Bewegungsarten** (G3) die größeren Hebel sind, und dass die Kaskade gutartig ist (G4).
- **O1-B1** (Szene aus Reihenfolge) bleibt sinnvoll. **O2-stay** behandelt nur einen Sonderfall von G3.

---

## 6. Notwendige Mechanik gegenüber gewachsenen Sonderfällen

| Mechanik | Zweck | Urteil |
|---|---|---|
| `no_go`: keine Ankunft aus Prosa | Spielerhoheit, keine Teleports (`.74`) | **unverzichtbar** |
| Ereignisgespeiste Ortsliste, `scene.moved` mit Zurückbleibenden | Kontinuität, Save/Reload, Swipe | **unverzichtbar** |
| PULSE-Vorentscheidung und Reisehalt (`.181`) | glaubwürdige Unterbrechung, vor der Erzählung entschieden | **behalten** (funktioniert: 11/11 und 27/29 Ankünfte bei geschlossenem Fenster) |
| Dungeon: Gate, Gebühr, Kapazität, Slots, `DUNGEON AHEAD`, Fortschritt, Reset | Kanon §7 | **behalten**, aber Räume und Durchgänge siehe Variante C |
| `met`, `KNOWN AT`, Schalterbindung | E2-A, Gildenintegrität | **behalten**, Bezug auf Bewegungsplan statt eigener Ankunftsprüfung |
| Szene je Meldung, `sceneIssues`, `scene_context` | ortsgebundene Meldungen nicht am falschen Ort | **verkleinern**: Szene aus Bewegungsplan und Reihenfolge (O1-B1); `scene_context` nur für ortsgebundene Typen |
| Katalog als Schema-Enum (M3) | halluzinierte IDs abfangen | **ersetzen**: Prüfung gegen das Ortsbuch; der Katalog wird nur Werbung |
| Sonderregel „aktive Jagdorte im Katalog“ (`catalog.js:110–112`) | gegen G1 geflickt | **entfällt** mit dem Ortsbuch |
| `scopedPlaces` (`place_refs.js:60–92`) | neuen Ort nachträglich unter Habitat oder Dungeon hängen | **entfällt** mit dem Bewegungsplan (Eltern vom Plan) |
| `explore` + `{new}`-Umschreibung + Zeile „a stair“ (`commands.js:464`, `625–626`, `697`) | Weg zu berichtetem Raum | **entfällt** mit dem Raumnetz |
| `unseen`/`exploring`/`elsewhere` (`world.js:2455–2475`) | zweite Topologie | **entfällt** für geplante Bewegungen |
| `levelVia` aus erzählter Richtung, `floorRefusal` für erzählte Durchgänge | Ebenen aus Prosa | **entfällt** im Raumnetz; bleibt als Schutz gegen erzählte Ebenen |
| `roomByName`, Dungeonraum-Erzeugung durch den Extractor | Räume aus Prosa | **entfällt** im Raumnetz |
| `retreatGo` mit `BACK_WAY`/`STAYS` (`planner.js:741–764`) | Rückweg aus Wortlaut | **entfällt** mit klarer Bewegungsart „zurück“ im Plannervertrag (Ortsbuch-Route) |
| `lodgedHere` (Ruleset < 2), `implicitArrivals` ohne C | Altpfade | **entfernen** (V6-Muster) |
| `within` (lokale Jagderkundung) | neue Habitatteile | **prüfen**: als Teilbewegung im Habitat (Variante B) |
| `expected.<seq>.arrived` neben `arrive` | zwei Meldungen derselben Ankunft (Fable U2) | **zusammenführen**: eine Ankunftsantwort je Planschritt |
| 4 × 400 Zeichen Korrekturen, freie Ablehnungszeilen | Erzählerhinweis | **ersetzen** durch einen Szenenkopf (§7, N1) |

---

## 7. Lösungsvarianten

Alle Varianten behalten `no_go`, das Eventlog, PULSE und die Dungeonautorität. Die Erzählrückführung **N** ist mit jeder Variante kombinierbar und steht am Ende des Abschnitts.

### Variante 0 – Weiter mit gezielten Korrekturen

**Kern:** die zwei `.188`-Pflichtfixes (Dungeonebene, Jagdortreferenz), danach weiter nach Befund.

**Wirkung:**
- Schließt die gemessenen Einzelfälle.
- Die Klassen K1–K4 bleiben offen. Die nächste Variante von K1 entsteht an der nächsten Stelle, an der zwei Topologien oder zwei Ortsmengen auseinanderlaufen.
- **Geschichte:** Seit `.74` gab es rund 22 Builds an derselben Naht, und `.186`/`.188` zeigen neue Formen.

**Aufwand:** S je Fix, dauerhaft. **Urteil:** nur als Überbrückung.

### Variante A – Ortsbuch und Bewegungsplan (Konsolidierung, ohne Kanonänderung)

**A1 – Ortsbuch: eine Ortsmenge, ein Auflöser, eine Hierarchieregel.**
- **Gültige Referenz:** jeder Ort, den Alaric kennt (besucht, gesehen oder berichtet), plus die Abstammung des aktuellen Ortes. Planner-GO, Extractor-Schema, World-Applier und Route prüfen gegen diese eine Menge. Der Katalog wird reine Werbung (Auswahl, Reihenfolge, Kürzung) und nie Gültigkeitsgrenze.
- **Ein Auflöser** für Namen nach festen Stufen: ID → Gildenhalle → Dungeon-Gate → Name im aktuellen Siedlungs- oder Stättenbaum (**einschließlich besuchter Orte**) → berichtet im Reich → neu.
  - Mehrdeutig heißt Rückfrage beziehungsweise `null`, nie still neu.
  - Neue Orte erhalten ihre Eltern nach **einer** Regel. Steht ein Bewegungsplan dahinter, gibt dieser die Eltern vor.
- **Personen:** Beim Anlegen einer Person an einem Ort sieht der Extractor die bekannten Personen dieses Ortes und seiner Kinder (`KNOWN AT` auch ohne GO, z. B. als „bekannt hier und darunter“).

**A2 – Bewegungsplan: ein Objekt pro Bewegung, vom GO-Handler erzeugt.**
- **Inhalt:** Ausgangsort, Zielort-ID oder geplanter neuer Ort (Name aus dem Plannerwort, Art und Eltern aus dem Ortsbuch), Weg und Halte, Ebene, Dungeon-Wurzel, Slot, PULSE-Leg und -Fenster, Begleiter, Zeitkappe.
- **Wer ihn liest:**
  - die **Erzählerzeile** (keine eigene Formulierung mehr wie „a stair“),
  - die **Extractor-Erwartung** (`expected` nur für Planschritte, Antwort nur `arrived` + gegebenenfalls Zwischenhalt),
  - die **Weltprüfung**.
- **Die Weltprüfung akzeptiert eine Ankunft genau dann, wenn sie dem Plan entspricht:** Ziel, ein Halt auf dem Planweg oder ein PULSE-Halt. Sie leitet keine eigene Topologie und keinen eigenen Dungeonbezug ab.
  - T2/T3 entfallen für geplante Bewegungen und bleiben nur für ungeplante Meldungen.
  - Die Erzählerzeile kann dadurch nie etwas ankündigen, was die Weltprüfung verbietet.

**A3 – Szene aus dem Plan.** Meldungen ohne Szene gehören vor der gemeldeten Ankunft zum Ausgangsort und danach zum Ziel (O1-B1 in der Form „Reihenfolge der Antwort“). `sceneIssues` fordert nur noch bei ortsgebundenen Typen nach.

**A4 – Aufräumen:** `lodgedHere`/`implicitArrivals`-Altpfade, `scopedPlaces`, die Jagdort-Sonderregel des Katalogs, die Umschreibung `explore` → `{new}`.

| | Wirkung |
|---|---|
| **Gelöst** (Daten `.186`/`.188`) | K1 wird **einheitlich entschieden** (10; nicht jede wird zur erlaubten Ankunft, siehe §12), Rogue #80 und #82 (Identität), K6 teilweise (eine Planerwartung ohne Zusatzschlüssel); Chronologie-Reparaturen deutlich weniger [S: ein Großteil der 11 von 24] |
| **Nicht gelöst** | K2–K5, K7 |
| **Neue Risiken** | ein falscher Plan ist jetzt **einheitlich** falsch (vorher fing eine zweite Prüfung manches ab); das Ortsbuch braucht eine gute Mehrdeutigkeitsregel; Migrationsfälle mit alten Orten unter falschen Eltern |
| **Spielgefühl** | unverändert frei; weniger verlorene Szenen |
| **Performance** | Extractor-Erwartungstext kürzer; weniger Reparaturen; kein zusätzlicher Aufruf |
| **Entfällt konkret** | Katalog-Enum als Gültigkeitsgrenze, `catalog.js:110–112`, `scopedPlaces`, `unseen`/`exploring`/`elsewhere` für geplante Bewegungen, GO-Zeilenvarianten, Teile von `placeIdentity` (vier der sieben Wege gehen in einer Stufenregel auf) |
| **Kanon** | keine Änderung: Ankunft bleibt eine bestätigte, autorisierte Meldung |
| **Aufwand / Risiko** | L / mittel: `arrive()` ist eine Closure über ein Dutzend lokale Variablen von `applyWorld`. Gefahrlos wird es nur, wenn die Planprüfung **vor** dem Herauslösen gegen den Korpus läuft |

### Variante B – A plus Bewegungsarten (Designentscheidung)

**Kern:** Der Plannervertrag kennt drei Arten von GO; alle erzeugen einen Bewegungsplan nach A2.
- **`go` (eigen):** wie heute.
- **`go` mit `with: <Person>` (Mitgehen):** Alaric geht mit einer anwesenden Person, die führt oder zu der er „jetzt gehen“ vorgeschlagen hat. Der Plan ist **bedingt**: Wirksam wird er erst, wenn die Antwort zeigt, dass die Person zustimmt und aufbricht. Sonst verfällt er ohne Ablehnung.
  - Das ist das Muster des bedingten Kaufs.
  - Die Entscheidung der NPC gehört ohnehin der Erzählung.
- **`go` mit `part: <Handlung>` (Teilbewegung):** eine gewählte Handlung führt zu ihrem genannten Gegenüber oder Gegenstand. Zum Beispiel „ich verkaufe ihr die Platten“ → ihr Laden, „ich suche einen Waffenhändler auf dem Markt“ → ein Stand, „hinauf in mein bezahltes Zimmer“.
  - **Grenze:** dieselbe Siedlung oder Stätte, nie Überland, nie Dungeon.
  - Ersetzt O2-stay und die Rückwegs-Wortlisten.
- **`move`** nur noch im Kampf oder in der Szene (Bänder). Außerhalb davon wird ein wirkungsloser Schritt als Rückfrage oder als „zurück“ über die Ortsbuch-Route geplant, nicht über Regex am Zitat.

| | Wirkung |
|---|---|
| **Gelöst** | K2 (4), K4 (2), Batch-28-Klasse „Arbeit, die eine Person anführt“ (8 von 18), O2-Fall Zimmer; K3 teilweise (klarere Bewegungsarten senken Planner-Fehlgriffe; nicht garantiert) |
| **Nicht gelöst** | K5, K7 |
| **Neue Risiken** | **Spielerhoheit:** ein Vorschlag wird zur bedingten Handlung. „Shall we go now?“ ist klar, „we could go later“ nicht; der Plannervertrag braucht eindeutige Gegenfälle (später, hypothetisch, ablehnende NPC). Teilbewegung darf nicht zur Hintertür für beliebige Ortswechsel werden; die harte Grenze ist dieselbe Siedlung bzw. Stätte und ein genanntes Gegenüber |
| **Spielgefühl** | **besser:** Begleitung und Alltagshandlungen fließen ohne zusätzliches „I go there“ |
| **Entfällt konkret** | `retreatGo`, `BACK_WAY`, `STAYS` (ersetzt durch eine Bewegungsart), die Rücknahme der abgeschalteten Zimmerausnahme, ein Teil der Korrekturtexte zu „did not voluntarily travel“ |
| **Kanon** | §2 („Fragen … sind keine autorisierten PC-Aktionen“) braucht eine Ausnahme für den Vorschlag „jetzt mitzugehen“; §3 (Teilbewegung) wird nur endlich umgesetzt |
| **Aufwand / Risiko** | M / mittel (Plannerverhalten, Gegenfälle) |

### Variante C – Raumnetz für Living Dungeons (Designentscheidung)

**Kern:** Ein Living Dungeon erhält beim Etablieren je Ebene ein **engine-erzeugtes Raumnetz**: Räume, Ausgänge mit Richtung, die Ebene als Eigenschaft und Slots an Räumen. Die Anzahl der Räume folgt Regelwerten, die Struktur variiert je Dungeon.
- **Bewegung:** Im Dungeon heißt Bewegung „Ausgang wählen“ oder „weiter“. Sie wird vor der Erzählung aufgelöst; der Dungeon entscheidet mit `DUNGEON AHEAD` heute schon vorab.
- **Erzähler:** beschreibt und **benennt** Räume beim ersten Sehen (`place.named`). Er erfindet keine Räume, Durchgänge oder Ebenen.
- **Extractor:** meldet im Dungeon keine Orte und Durchgänge mehr, nur Inhalte.

| | Wirkung |
|---|---|
| **Gelöst** | beide Mage-Expeditionen (`.186` 5, `.188` 3 Ablehnungen plus `TARGET NEEDED`); alle Formen „Raum erlaubt, Ankunft abgelehnt“ im Dungeon |
| **Neue Risiken** | **weniger Freiheit:** keine erzählte Geheimtreppe ohne Netz; dafür sind verborgene Ausgänge vorzusehen (`hidden`-Links gibt es schon). Das Netz muss zu bestehenden Dungeons migriert oder für sie neu erzeugt werden |
| **Spielgefühl** | Dungeons werden **spielbarer** (klare Wege, Boss erreichbar), etwas weniger überraschend im Grundriss; Atmosphäre bleibt beim Erzähler |
| **Performance** | weniger Extractor-Vertrag (`passage`, Raumregeln), kein Reparaturbedarf für Dungeonorte |
| **Entfällt konkret** | `roomByName`, Raum- und Durchgangsmeldungen im Dungeon, `levelVia` aus Erzählung, `explore`, `unseen`/`elsewhere` für Dungeons, ein großer Teil von `world.js:2420–2570` |
| **Kanon** | §7 verlangt „Videospielstruktur“ und Engine-Slotautorität und verbietet eine „universelle Raumstruktur“. Ein **je Dungeon** erzeugtes Netz ist keine universelle Struktur und kein Drehbuch (§10). Trotzdem ist es eine neue Festlegung, die der Nutzer treffen muss |
| **Aufwand / Risiko** | L / mittel (abgegrenzt auf Living Dungeons; andere Höhlen bleiben erzählte Orte) |

### Variante D – Die Engine bewegt immer vor der Erzählung (radikal)

**Kern:** Jedes GO wird vor der Erzählung aufgelöst.
- **Bekanntes Ziel:** `ARRIVES` oder `STOPS` (PULSE).
- **Neuer Ort:** Die Engine legt ihn aus dem Plannerwort an, mit Eltern aus dem Ortsbuch.
- Der Extractor meldet keine Ankunft mehr; die Szene aller Meldungen ist das Planergebnis.

| | Wirkung |
|---|---|
| **Gelöst** | K1, K6, `arrival pending`, Gildenbedingungen, `met_without_arrival`, Chronologie für GO-Züge |
| **Nicht gelöst** | K2–K5, K7, also **der größere Teil** (16 von 26 Ablehnungen entstehen ohne GO) |
| **Neue Risiken** | Erzähler erzählt eine Unterbrechung, die Engine hat schon bewegt (Text-Zustand-Widerspruch in Gegenrichtung); neue Orte aus Richtungsworten („toward the source of the scraping“, 44 % der GOs) bekommen schlechte Namen und Eltern; Anwesenheit am Ziel bleibt offen (Opus 5.5 §3.4) |
| **Spielgefühl** | weniger Überraschung auf kurzen Wegen; Erzähler verliert die Freiheit, Reisen selbst zu unterbrechen |
| **Entfällt konkret** | `arrive`/`expected` für GO-Züge, Bedingungsbefehle, Chronologie für GO-Züge |
| **Kommt hinzu** | Reisezeitmodell, Ortserzeugung durch die Engine, zweite Ankunftsimplementierung oder ausgelagertes `arrive()`, umfangreiche Replay-Freigaben |
| **Kanon** | grundlegende Änderung von §2 |
| **Aufwand / Risiko** | XL / hoch |

**Urteil:** Die neuen Daten verschieben das Opus-5.5-Urteil zu V1 nicht. D löst nur, was A+C einfacher lösen; der größere Rest liegt außerhalb.

### Variante E – Vereinfachtes Ortsmodell (radikal)

**Kern:**
- **Ortsebenen:** Außerhalb von Dungeons kennt die Engine nur drei Ebenen: Gebiet (Wildnis, Habitat), Ort (Siedlung oder einzelne Stätte) und Stelle (Gebäude oder Landmarke im Ort). Innenräume (Zimmer, Hinterzimmer, Keller) sind reine Erzählung ohne ID.
- **Bewegung:** Innerhalb einer Stelle ist sie frei. Zwischen Stellen eines Ortes bewegt die Engine sofort, als lokaler Schritt ohne PULSE-Reise. Zwischen Orten gilt die heutige Reise.

| | Wirkung |
|---|---|
| **Gelöst** | Zimmer- und Hinterzimmerfälle (O2, `.188` Rogue #122), ein Teil von K2 |
| **Messwert** | Innenräume außerhalb von Dungeons: 6 von 58 und 9 von 82 Ortswechseln (≈ 11 %); ortsbezogene `place`-Ablehnungen mit Innenraumbezug: 1 in zwei Batches |
| **Neue Risiken** | Personen und Dinge verlieren Raumgenauigkeit: Steward im Hinterzimmer, Meister Ostrek in der Abdeckerei; das betrifft auch E2/E3 und `KNOWN AT`. Migration bestehender Kampagnen. Der lokale Sofortschritt ist eine Kanonänderung (§2) |
| **Spielgefühl** | spürbar gröber in Städten |
| **Entfällt konkret** | Art `interior` außerhalb von Dungeons, Teile von `placeParent`, die Zimmerfrage, Raumebene in `KNOWN AT` |
| **Aufwand / Risiko** | L / hoch (Migration) |

**Urteil:** Der gemessene Gewinn ist zu klein für den Verlust und die Migration. Als **Reserve** behalten, falls nach A+B die Innenräume weiter auffallen.

### Erzählrückführung N (mit jeder Variante)

- **N1 – Szenenkopf statt Korrektursatz.** Der Engineblock beginnt mit einem festen Kopf, zum Beispiel `WHERE: Dagny's blue-door house. … Not here: Werrin (at reeve's hall).` (**Präzisiert:** keine absolute Formel „begins and ends here“, weil PULSE-Halt und äußere Kräfte die Endszene ändern dürfen; Fassung in Fachplan C §3 C5)
  - Die Korrekturen zu Ort und Anwesenheit gehen darin auf.
  - **Abwesende Personen**, die die Spielernachricht anspricht, nennt der Kopf ausdrücklich.
  - Keine Kanonänderung. Aufwand S.
- **N2 – Klartext für den Spieler.** Das Panel nennt bei abgelehnter Ankunft „NOT ARRIVED — Alaric is still at …; … was not reached“ statt „ENGINE REFUSED 6 … see #audit“. Keine Kanonänderung. Aufwand S.
- **N3 – Einmalige Neuerzeugung vor dem nächsten Zug.** Meldet die Extraktion eine Ankunft ohne GO (`no_go`, nicht `passage`), erzeugt der Host die Antwort **einmal** neu, mit dem Szenenkopf, wie ein automatischer Swipe.
  - **Kosten:** in `.188` 11 von 195 Antworten (5,6 %), also etwa +2 % Tokens und +10–20 s in diesen Zügen [S].
  - **Gewinn:** Die falsche Szene wird nie Verlauf. Damit entfallen K7 und der Persona-Effekt.
  - **Risiken:** Der Ersatz ist sichtbar; die zweite Antwort kann wieder abweichen (höchstens ein Versuch); die Host-Integration (ST-Swipe) ist zu prüfen.
  - Designentscheidung, Aufwand M. **Erst als Messversuch.**

---

## 8. Vergleich und Empfehlung

### 8.1 Vergleich

| Kriterium | 0 | A | A+B | A+C | D | E | N1+N2 / N3 |
|---|---|---|---|---|---|---|---|
| Abgelehnte Ankünfte `.186`/`.188` (26), die strukturell entfallen [S] | Einzelfälle | 10–11 | 16–17 | 10–11 (mit A) | 10–11 | 2–3 | K7: 4 / mehr |
| Ortsidentitätsfehler (#80, #82, `.179`-B) | einzeln | **ja** | ja | ja | teilweise | teilweise | – |
| Neue Fehlerquellen | gleiche wie bisher | einheitlich falscher Plan | Vorschlag als Handlung | Netz zu starr | Text-Zustand-Gegenrichtung, schlechte Ortsnamen | Raumgenauigkeit | Ersatzantwort |
| Spielerhoheit | = | = | Vorschlag „jetzt“ wird bedingte Handlung | = | Unterbrechung nur durch PULSE | lokaler Schritt automatisch | = |
| Erzählfreiheit | = | = | etwas mehr (Begleitung fließt) | Grundriss im Dungeon festgelegt | geringer | gröber | = |
| Tokens / Latenz | = | leicht weniger | leicht mehr Plannervertrag | weniger Extractorvertrag | weniger Extractor, mehr Kontext | weniger | = / +2 % |
| Zustände und Schnittstellen | wachsen | **weniger** (eine Ortsmenge, ein Plan) | + Bewegungsart | + Netz, − Raummeldungen | + Reisezeit, + Ortserzeugung | − Innenraum | + Szenenkopf |
| Nachträgliche Prüfungen | wachsen | − T2/T3 für Pläne | − Wortlisten | − Dungeon-Topologie | − Ankunftsprüfung GO | − Raumprüfung | – |
| Kanonänderung | nein | **nein** | ja (§2 Vorschlag) | ja (§7 Präzisierung) | ja (§2 grundlegend) | ja | N3 ja |
| Aufwand / Regressionsrisiko | S, dauerhaft / gering | L / mittel | M / mittel | L / mittel | XL / hoch | L / hoch | S / gering · M / mittel |

### 8.2 Empfohlene Zielarchitektur

**Ortsbuch + Bewegungsplan (A) als Fundament, darauf Raumnetz für Living Dungeons (C) und Bewegungsarten (B), dazu N1/N2 sofort und N3 als Messversuch.** Nicht D, nicht E.

**Begründung:**
1. **A beseitigt die einzige Klasse, die ein reiner Engine-Fehler ist (K1),** und die Identitätsfehler. Dafür ist keine Designänderung nötig, und netto entfällt Code (§6).
2. **C macht den Dungeon zu dem, was der Kanon §7 schon beschreibt:** Engine-Struktur, Erzähler-Atmosphäre. Beide natürlichen Dungeon-Expeditionen der letzten Batches scheiterten genau an der Mischform.
3. **B setzt eine vorhandene Kanonregel (§3) endlich um** und adressiert die größte Ursprungsklasse ohne GO. Das ist die einzige Variante, die die Zahl der Ankünfte ohne GO senkt, statt sie nur besser abzulehnen.
4. **N1/N2 sind billig.** N3 kann K7 und den Persona-Effekt beseitigen; ob es sich lohnt, muss gemessen werden.
5. **D und E lösen weniger, als sie kosten:** D wirkt nur auf GO-Züge (10 von 26), E nur auf Innenräume (≈ 11 % der Wechsel).

**Lohnt sich der Umbau?** Ja, für A und C ohne Vorbehalt, für B nach der Designentscheidung. Die Abwägung:
- **Für den Umbau:**
  - Der Bereich verursacht in beiden letzten natürlichen Batches 40–48 % aller Weltablehnungen und rund 10 % der Eingaben in widersprüchlichem Zustand. Beide Dungeon-Besuche des Magiers scheiterten an der Engine: `.186` ganz, `.188` am Boss.
  - 18 % aller Commits betreffen ihn, und die Fehler konvergieren nicht.
- **Gegen den Umbau:** Der Normalfall funktioniert (85 % der autorisierten GOs kommen an), und `arrive()` ist der heikelste Codeblock der Engine. Deshalb **stufenweise mit messbaren Zwischenständen** statt in einem Großumbau.

### 8.3 Was entfallen kann

| Bereich | Entfällt mit | Stelle |
|---|---|---|
| Katalog als Gültigkeitsgrenze, Jagdort-Sonderregel, Routefilter auf Katalog | A1 | `extract.js:39–44` (Enum), `catalog.js:110–112`, `planner.js:330` |
| `scopedPlaces` | A2 | `place_refs.js:60–92` |
| Zweite Topologie für geplante Bewegungen | A2 | `world.js:2455–2475` |
| Szenenpflicht je Meldung, Chronologie-Reparaturen (**präzisiert:** Szene aus der bestätigten Ankunftsposition; Inhalte eines unerreichten Ortes bleiben gesperrt, keine Freistellung „ortsneutraler“ Typen) | A3 / Fachplan A, A4 | `extract.js:419` ff.; `world.js:1066`, `1074` bleiben als Schutz |
| Altpfade | A4 | `world.js:121`, `firewall.js:411`; `implicitArrivals` |
| Rückweg-Wortlisten | B | `planner.js:741–764`, Teile von `mapPlan` |
| Erkundung über `{new}`, „a stair“-Zeile, Raum- und Durchgangsmeldungen im Dungeon, `roomByName`, `levelVia` aus Erzählung | C | `commands.js:464`, `625–626`, `697`; `dungeon.js:324`, `358`; `world.js:2420–2570` (Dungeonteil); Vertrag `passage` (1,1k Zeichen) |
| Korrektursätze zu Ort und Anwesenheit | N1 | Korrekturstellen in `world.js` mit Ortsbezug (Fable zählte an `.179` insgesamt 60) |

**Unverzichtbar:**
- `no_go` (keine Teleports),
- Gate, Gebühr, Kapazität, Slot- und Bossautorität,
- PULSE vor der Erzählung und der Reisehalt `.181`,
- Zurückbleibende und Begleiter beim Ortswechsel,
- Zeugenregeln für Wissen,
- Schalterbindung an die tatsächlich erreichte Halle,
- Szenenprüfung für **ortsgebundene** Meldungen (Person neu, Angebot, Objekt, Kreatur).

---

## 9. Umsetzungsstrategie

| Stufe | Inhalt | Sicherer Zwischenstand | Erfolgskriterium |
|---|---|---|---|
| **S0 Messen** (S) | Werkzeug wie `model_budget_report`: abgelehnte Ankünfte nach K1–K7, Episodenlänge, Ortsanteil der Ablehnungen, Duplikate (Ort, NPC), autorisiert-aber-abgelehnt. Basis: die Zahlen in §3 | keine Produktänderung | Werkzeug reproduziert §3.1–§3.3 |
| **S1 Ortsbuch** (M) | eine Gültigkeitsfunktion, ein Auflöser; Schema gegen das Ortsbuch; Katalog nur Werbung | Replay: nur Fälle mit vorher abgelehnter gültiger ID ändern sich | `.188` #80/#82 als Regression grün; Korpus ohne neue Duplikate |
| **S2 Bewegungsplan** (L) | GO erzeugt den Plan; Erzählerzeile und `expected` aus dem Plan; Weltprüfung gegen den Plan; T2/T3 nur noch für ungeplante Meldungen | Plan zuerst **nur protokollieren** und gegen die heutige Prüfung vergleichen (Schattenmodus über den Korpus), dann umschalten | 0 Fälle „autorisiert, Ankunft von der Engine abgelehnt“ in Korpus und Regressionen; Nettozeilen im Reisepfad negativ |
| **S3 N1/N2** (S) | Szenenkopf, Klartext im Panel | sofort, unabhängig | kurzer natürlicher Lauf: Wiederholungen K7 halbiert [Ziel] |
| **S4 Raumnetz** (L, nach Entscheidung) | Netz beim Etablieren; Bewegung über Ausgänge; Erzähler benennt | bestehende Dungeons behalten ihre bekannten Räume, neue Teile aus dem Netz | Dungeon-Expedition mit Boss im natürlichen Lauf ohne `passage`-Ablehnung |
| **S5 Bewegungsarten** (M, nach Entscheidung) | `with`/`part` im Plannervertrag, bedingter Plan | Gegenfälle zuerst (später, hypothetisch, Ablehnung der NPC, anderer Ort) | Ankünfte ohne GO im natürlichen Lauf ≤ ein Drittel von heute |
| **S6 N3** (M, nach Entscheidung) | einmalige Neuerzeugung | hinter Schalter, erst Messlauf | K7 = 0, Latenz der betroffenen Züge gemessen |

**Gesamtziele nach S1–S5:**

| Kennzahl | heute (`.186`/`.188`) | Ziel |
|---|---|---|
| Ortsanteil an allen Ablehnungen | 40–48 % | unter 25 % |
| Antworten mit widersprüchlichem Ort (rekonstruiert) | rund 10 % | unter 3 % |
| Ankünfte, die die Engine selbst ablehnt | 7 % der autorisierten GOs | 0 |
| Ortsbezogene Extractor-Reparaturen | 16 von 24 der Stichprobe | halbiert |
| Doppelte Orte oder NPCs | vorhanden | keine |

**Arbeitsregeln:**
- Jede Stufe misst Nettozeilen. Eine Stufe, die nur eine Schicht hinzufügt, ist nicht abgeschlossen.
- Jede Stufe endet mit einem **kurzen** natürlichen Lauf, der genau ihre Klasse anspricht, nicht mit einem großen Batch.

---

## 10. Offene Designentscheidungen

| # | Frage | Empfehlung | Gewinn | Verlust |
|---|---|---|---|---|
| **D1** | Erzeugt die Engine das Raumnetz eines Living Dungeons (Räume, Ausgänge, Ebenen), während der Erzähler nur beschreibt und benennt? | **ja**, aber **beim Betreten** statt vorab (ersetzt durch Fachplan B, Variante B6) | Dungeons zuverlässig spielbar, Boss erreichbar | erzählte Grundrissüberraschungen; verborgene Ausgänge nur, wo das Netz sie hat |
| **D2** | Wird „jetzt gemeinsam gehen“ (Vorschlag oder Einladung, die NPC führt) zu einer **bedingten** Bewegung, die mit erzählter Zustimmung wirksam wird? | **zurückgezogen:** Fragen und Vorschläge bleiben Dialog; nur eine ausdrückliche Mitgehzusage kommt infrage, und auch die nur optional (Fachplan C, C2) | Begleitung ohne Extrazug, weniger Drift | ein Vorschlag ist nicht mehr folgenlos |
| **D3** | Wird die Teilbewegung einer gewählten Handlung (Kanon §3) als eigene Bewegungsart umgesetzt, begrenzt auf dieselbe Siedlung bzw. Stätte und ein genanntes Gegenüber? | **eingeschränkt:** nur innerhalb derselben Stätte, nicht zu Gegenübern oder Gesuchtem im Ort (Fachplan C, C3-a) | Handel und Suche fließen; ersetzt die Zimmerfrage | Grenze muss streng bleiben |
| **D4** | Darf der Host eine Antwort mit unautorisierter Ankunft einmal automatisch neu erzeugen? | **erst messen** | keine falsche Szene im Verlauf | sichtbarer Ersatz, Latenz |
| **D5** | Innenräume außerhalb von Dungeons nur erzählerisch? | **nein, jetzt nicht** | – | Raumgenauigkeit |
| **D6** | Ankunft vor der Erzählung für alle Reisen (D)? | **nein** | – | Erzählfreiheit, hoher Umbau |

Für A, N1 und N2 ist keine Designentscheidung nötig.

---

## 11. Unsicherheiten und Grenzen

- **Datenmenge:** Die Klassifikation beruht auf zwei natürlichen Batches (26 abgelehnte Ankünfte) und einem älteren Korpus. Die Anteile (40–48 %) hängen vom Spielprofil ab; der Korpus zeigt 18 %.
- **FOCUS-Auszüge:** Die Reparaturanteile stammen aus ihnen und sind auf Problemzüge verzerrt.
- **Schätzungen [S]:** Die erwarteten Einsparungen sind nicht implementiert oder gemessen. Sie folgen aus der Zuordnung der Originalfälle zu den Klassen.
- **Verhalten der Modelle:**
  - Ob B die Planner-Fehlgriffe (K3) senkt, ist offen.
  - Ob N1 die Wiederholungen (K7) ohne N3 deutlich senkt, ist offen. `.188` zeigt, dass eine präzise Korrektur befolgt wird, aber gegen eine widersprechende Spielernachricht verliert.
- **`arrive()` als Closure** über `applyWorld`: Der Aufwand von S2 kann höher ausfallen. Der Schattenmodus ist deshalb Pflicht.
- **Andere Modelle:** Die Messung gilt für GLM-5.3-Flash. Ein stärkeres Modell würde K3–K5 vermutlich senken, K1 nicht [P].
- **`.189`:** ist in keinem natürlichen Lauf geprüft. Seine Wortregeln (R1/R2) würden in A+B teilweise entfallen.

---

## 12. Nachtrag: Korrekturen nach Selbstprüfung

| Stelle | Ursprüngliche Aussage | Korrektur | Quelle |
|---|---|---|---|
| §1.1, §5 G1 | „Niemand besitzt den Ort“ | Das gefaltete Eventlog **ist** die Autorität über den tatsächlichen Ort. Es fehlt eine **gemeinsame Definition** der gültigen Ortsreferenzen, der erlaubten Bewegungsversuche und ihrer Ankunftsprüfung | GPT §1 |
| §2.5 | Spieler sah „ENGINE REFUSED …“ | Nur die Runner-LLM sah es; ein menschlicher Spieler sieht keinen Hinweis (`playerFacingLines` filtert) | Code `host.js:459` |
| §3.1 | 40–48 % Ortsanteil | überwiegend Folgeablehnungen (50/61, 79/95); unabhängige Primärfehler sind 11 bzw. 16 | GPT §4.1 |
| §3.2 | 76/59 GOs, 44 % neue Orte | 76 ID, 52 `{new}`, 7 `within`, 9 `journey.continue`; neue Ziele 39 % von 135 GOs | Fachplan A §0 |
| §3.3 K1 | „Engine widerspricht sich selbst“ (10) | breite Klasse „Widerspruch am Bewegungs- und Ankunftsvertrag“. Eng belegt sind: die Ebenenregel gegen die eigene Ansage (`.188` Mage #96; #92/#100 hängen an derselben Ansage ohne gemeldeten Weg), die Zielauflösung (`.186` Mage 5×) und die Raumregel außerhalb von Dungeons (`.188` Rogue #62). `.186` Warrior #122 ist eine **regelgerechte** Hierarchieablehnung einer falschen Extractormeldung | GPT §4.1 |
| §7 A | „K1 vollständig gelöst“ | A entscheidet diese Fälle einheitlich und früh; nicht jede wird zur erlaubten Ankunft | GPT §4.1 |
| §7 A1 | eine gültige Ortsmenge = alle bekannten Orte | ein Bestand, **vier Sichten** (existiert, bekannt, beworben, erreichbar); Auflöser mit `existing`/`ambiguous`/`new`/`invalid` | GPT §3.1, Fachplan A §4.1 |
| §7 A2 | Ankunft gilt, „wenn sie dem Plan entspricht“ | Autorisierung ist kein Ankunftsversprechen; der Nachweis nennt zulässige Ergebnisse, die Ankunft bleibt eine bestätigte Meldung | GPT §3.2, Fachplan A §4.2 |
| §7 A3 | Szenenpflicht für ortsneutrale Meldungen entfällt | ersetzt durch „Szene aus der Ankunftsposition“; Inhalte unerreichter Orte bleiben gesperrt | GPT §3.3, Fachplan A A4 |
| §7 C / D1 | Raumnetz je Ebene beim Etablieren | Netz **beim Betreten** (B6: Hauptgang mit Seitenräumen) | GPT §3.4, Fachplan B |
| §7 B / D2 | „Shall we go now?“ als bedingte Reise | Fragen bleiben Dialog; nur eine ausdrückliche Mitgehzusage, optional | GPT §3.5, Fachplan C C2 |
| §7 B / D3 | Teilbewegung in derselben Siedlung | nur innerhalb derselben Stätte | GPT §3.5, Fachplan C C3 |
| §7 N1 | „begins and ends here“ | aus Plan und Outcome abgeleiteter Kopf ohne absolute Endformel | GPT §5, Fachplan C C5 |
| §7 N | – | neu: **N4 Verlaufsmarkierung** im Modellrequest statt Neuerzeugung | Fachplan C C5 |

**Keine Produktänderung durch diese Analyse.**
