# Unabhängiger Opus-Gegenreview – natürlicher Dreierbatch `.188` (14.11.2026)

**Gegenstand:** [GPT-Originalreview](REVIEW.md) des Batches `npc-batch-20261114-161005Z`. Quellenbelege: [SOURCE_MANIFEST.md](SOURCE_MANIFEST.md). Vergleich: [`.186`-Batch](../npc-20261114-094810Z/REVIEW.md) und [Opus-Gegenreview `.186`](../npc-20261114-094810Z/GEGENREVIEW_OPUS.md).

> **Getesteter Build: ausschließlich `.188` (`823fd6f`).** Der inzwischen aktuelle Build `.189` (`4438241`) ändert nur zwei Wortregeln: `paidWorkLine` und die Bleibe-Zeichen des Rückwegs. **`.189` ist durch diesen Lauf nicht natürlich geprüft.**

## Datengrundlage

**Gelesen** aus dem Nutzerauszug `npc-batch-20261114-161005Z-OPUS-GEGENREVIEW.zip` (8.401.646 Byte):
- alle drei `chat.jsonl` mit den gespeicherten Records,
- `avereth-events.json`, `calls.json` (alle 638 Aufrufe), `npc-pulse.json`, `player.jsonl`,
- die 342 unveränderten FOCUS-Modellaufrufe laut `MANIFEST.json`.

**Isolierte Gegenproben** mit dem Produktcode bei `823fd6f`, nur lesend in einem eigenen Checkout:
- `foldChat` und `validateState` über alle drei vollständigen Chats,
- `catalogPlaces` am Rogue-Zustand #21–#81,
- `budgetReport` (`tools/model_budget_report.mjs`) über alle `calls.json`.

Keine Node-Suite, kein Replay, kein ST-Smoke, keine Produktänderung.

**Evidenzgrenzen:**
- **Rohrequests** liegen nur für die FOCUS-Turns vor. Bei Mage fehlen die Turns 46 und 48 (#91–#96); für sie gelten die Records (`dungeon.ahead`, `cmd.resolved`, abgelehnte Deltas). Turn 50 (#99/#100) liegt vor.
- **Zählweise:** Chatindex `#n` ab der Begrüßung (#0). Spielerinput I*n* ist #(2*n*−1); `calls.json`-`turn` ist der Inputindex.

## 1. Gesamturteil

GPTs Hauptlinie hält: technisch fortsetzbar, kein falsch gerichteter Geldfluss, zwei terminale Rogue-Extraktionen, erneute erzählte Ortsdrift. In zwei Punkten verschiebt sich die Ursache auf die Engine. Ein schwerer Fall fehlt im GPT-Review ganz.

| GPT-Befund | Urteil | Abweichung / Präzisierung |
|---|---|---|
| Kennzahlen 70/70/70, 402/402 Eventgruppen, 3.361 Events, 638 Aufrufe | **bestätigt** | Eigener Fold aller drei Chats mit `.188`: **0 Foldfehler, 0 Validierungsprobleme**; Export = Chat 138/136/128 |
| Geldbewegungen, keine neue −14-cp-Fehlbuchung | **bestätigt** | Kontoverläufe aus `coin.changed` identisch: W 50→30→75→135→185, R 50→30→65→61→49, M 50→30→20→46→40→39 |
| **Rogue #80:** „weder katalogisierte Place-ID noch gültiges `{new}`“ | **widerlegt in der Ursache** | Die ID ist ein **realer, zweimal besuchter Ort**. Die Engine nennt sie selbst im Extractor-Kontext (`COMPLETED TODAY … at realm.duskreach.the_tannery_rows_…`), lässt sie aber nicht als Referenz zu: Der Katalog führt Jagdorte nur für **aktive** Aufträge (`catalog.js:112`). Der Fehler entstand in der Engine, nicht im Modell |
| (folgt aus #80) | **neu, von GPT übersehen** | Dieselbe Kontextlücke erzeugt bei #82 einen **doppelten Ort** (`loc.ashbridge.the_tannery_rows` neben dem echten Ort) und einen **doppelten NPC** (`npc.ostrek` neben `npc.meister_ostrek`) |
| **Rogue #98:** `expected["2"]=null` trotz Reparatur | **bestätigt, präzisiert** | Echter Modellfehler. Die Reparatur nannte den Fehler korrekt, und das Modell behob die beiden anderen Fehler der Liste. Der Zusatzschlüssel ist `null` und behauptet nichts. Folge: drei Spielerzüge im falschen Ort, Selbstheilung bei #106 |
| **Warrior #109–#112, Rogue #75–#78:** Drift trotz Stay-Korrektur | **bestätigt, Ursache präzisiert** | Die benannte Korrektur stand **jeweils im nächsten Narrator-Request** (Warrior vollständig, Rogue bei 400 Zeichen abgeschnitten). Auslöser ist beide Male ein bloßer **Vorschlag** („whenever she is“, „Shall we go … now?“), den der Begleiter-NPC annimmt. Der Erzähler kehrt jeweils nach **zwei** Antworten zum richtigen Ort zurück (`.186`: rund sechs) |
| **Mage #66–#69:** Bündel `service: other`, kein `lodging` | **bestätigt, Schwere geringer** | Schlaf, Erholung und PULSE liefen regulär, denn das Gasthaus ist ein Innenraum (`frame inside`). Folgenlos in diesem Lauf; nur `PAID HERE` für eine zweite Nacht fehlt |
| **Mage-Dungeon:** „frei erzählte Glimmer Queen“ korrekt abgewiesen | **präzisiert** | Die Queen ist der **eigene Boss-Slot der Engine** (`dungeon.ahead` Slot `queen`). Die Abweisung von `creature.new` ist richtig, das eigentliche Problem liegt woanders (nächste Zeile) |
| (Mage #91–#102) | **neu, von GPT übersehen: schwerster Fall des Batches** | **Sechs Züge Endlosschleife:** Die Engine autorisiert dreimal ein GO zur „deep gallery“ und kündigt die Queen an (`DUNGEON AHEAD`). Die Erzählung folgt mit „a stair … down“, die Engine liest das als nicht existierende Ebene 2 und weist die Ankunft ab. Dreimal `ATTACK — TARGET NEEDED` |
| E3 15 Anker / 9 voll | **bestätigt** | Nachgezählt 8/3/4, `anchor_on_card` 5/3/1. Etwa 5 von 15 Ankern tragen eine Situation statt eines dauerhaften Zugs |
| PULSE 144/24 | **bestätigt** | Nachgezählt 60/49/35 Würfe, 11/9/4 offen |
| 0 × `finish=length` | **bestätigt, keine Kausalbehauptung** | Alle 638 `stop`, 0 leer. Der P1f-Pfad lief **nie** an. Der Reasoning-Ausreißer fehlt auf beiden Provider-Backends; die Ursache ist unbelegt |
| R1/R2 nicht natürlich geprüft | **bestätigt** | 0 × `work_not_purchase`, 0 Planner-`move` im ganzen Batch |

## 2. Rogue #80 – Ursache in der Engine: ein genannter Ort, der nicht referenzierbar ist

**Ablauf (n121/n122, beide `finish: stop`):**
- **Der Fehler:** Der Extractor meldet `person.new` „Ostrek“ mit `at: "realm.duskreach.the_tannery_rows_behind_the_ashbridge_tanneries"`. Die Engine weist ab: `.at: matches none of anyOf`.
- **Die Reparatur:** Sie verlangt „use a known place id“. Die Begründung der zweiten Antwort lautet wörtlich: *„Tannery rows place id … that's a known id in catalog (used in quest). Use it.“*

**Was wirklich vorlag:**

| Prüfung | Beleg |
|---|---|
| Der Ort existiert | `place.created` #15 (`kind: site`, `parent: realm.duskreach`, `by: guild`), `scene.moved` dorthin #20 und #40, `known: visited` |
| Die Engine nennt ihn im Request | `COMPLETED TODAY: quest.cull_the_stray_hound_at_the_tannery_rows (… target population: stray hound at realm.duskreach.the_tannery_rows_behind_the_ashbridge_tanneries …)` |
| Er fehlt in den gültigen Referenzen | `PLACES:` des Requests ohne diese ID; eigener `catalogPlaces`-Aufruf am gefalteten Zustand #79/#81: **nicht enthalten** (bei #47, Auftrag aktiv: enthalten) |
| Warum | `catalog.js:110–112`: „Active hunting sites are named by id in QUESTS … Keep those same ids valid“, **nur für `status === 'active'`**. Nach der Erledigung bleibt der Ort in `COMPLETED TODAY` genannt, verschwindet aber aus dem Katalog. Er ist außerdem eine Stätte im Reich (kein Kind der Stadt) und nicht mehr „reported“; damit greift keine andere Regel. `RECENT ROUTE` wird gegen den Katalog gefiltert (`planner.js:330`) und zeigt nur noch `loc.ashbridge` |

**Folgen über #80 hinaus (von GPT nicht erfasst):**
- **Verloren ging bei #80:** Ostreks Beruf, ein `quest.detail` zum bereits erledigten Auftrag, die Erinnerung an Vessas Zustimmung zum Köderplan, 4 Minuten. Der Spielverlauf trägt das in der Erzählung weiter.
- **Doppelter Ort:** Bei #76/#78 schlug der Extractor bereits `{"new": {"name": "the Tannery Rows behind the Ashbridge tanneries", "parent": "loc.ashbridge"}}` vor; das GO fehlte noch. Bei #81 bucht der Planner `go {"new": "the tannery rows"}`, weil er den Ort nicht kennt. #82 legt **`loc.ashbridge.the_tannery_rows` neu an**. Der Endzustand hat zwei Tannery Rows.
- **Doppelter NPC:** In den Turns 38–41 enthält **keiner** der zwölf Requests (Planner, Erzähler, Extractor) `npc.meister_ostrek`; `KNOWN PERSON CONTINUITY: none relevant`. Der Erzähler erfindet „Ostrek“ neu („thick-armed man …“ statt des grauen Meisters), #82 legt **`npc.ostrek`** an. Erzählerisch ist es derselbe Auftraggeber: Thread t25.1 „Ostrek offers Alaric paid evening walks“ gehört zu `npc.meister_ostrek`.

**Einordnung:** Kein Schemaproblem und kein Grund, das Schema zu lockern. Die Engine bietet eine ID an, die sie nicht annimmt. Damit verstößt sie gegen ihren eigenen Grundsatz aus `catalog.js:108` („must advertise the same destinations“). **Pflicht, eng:** Jede Orts-ID, die der Kontext nennt (Jagdort eines Auftrags in `COMPLETED TODAY`, besuchte Stätten aus `scene.history`), muss als Referenz gültig sein. Dazu Gegenfälle für Dungeonräume und unbekannte Räume, damit `fits()` und die Sichtbarkeitsregeln unverändert bleiben.

## 3. Rogue #98 – Modellfehler mit nicht behauptendem Zusatzschlüssel

**Belege:**
- **Plan (#97):** genau ein `go` nach `loc.ashbridge.guild_hall`, `authorized`.
- **Request n150:** verlangt nur `"1"` („answer every key: "1"“). Antwort: `"expected": {"1": {arrived: true, at: guild_hall, with: [vessa], met: [clerk]}, "2": null}`.
- **Reparatur n151:** nennt drei Fehler, den Zusatzschlüssel als ersten, und gibt das Gerüst nur mit `"1"`. Das Modell behebt die beiden Szenenfehler (Deltas 1–3 bekommen `scene: loc.outflow_bank`) und **behält `"2": null`**.
- **Kein Muster:** In allen FOCUS-Extraktionen ist das der einzige Zusatzschlüssel ohne Inhalt. Alle anderen mehrstelligen `expected` gehören zu echten Mehrfachschritten.

**Folgen:**
- #99 spricht der Spieler mit der Schreiberin in der Halle; #100 weist die Ankunft mit `no_go` ab.
- #104 kehrt der Erzähler hart zum Ufer zurück (*„there was no clerk to hear them“*).
- #105/#106: `journey.continue`, die Ankunft wird gebucht.
- Drei Spielerzüge (I50–I52) liefen im falschen Ort; der Bericht wurde bei #107/#108 wiederholt. Kein Geld- oder Questverlust.

**Bewertung:** Echter Modellfehler, die Engine ist korrekt. Die engste mögliche Hilfe ändert kein Schema: einen nicht angeforderten `expected`-Schlüssel mit dem Wert `null` vor der Prüfung verwerfen, denn er behauptet nichts. Ein Schlüssel mit Inhalt bliebe ein Fehler; es gibt keine dritte Modellrunde. **Sinnvoll**, keine Pflicht.

## 4. Ortsdrift trotz Stay-Korrektur – die Korrektur war da; der Auslöser ist ein Vorschlag

| | Warrior #109–#114 | Rogue #75–#80 |
|---|---|---|
| Spieler | „ready to walk with her to Werrin **whenever she is**“ | „**Shall we go** ask him … **now, then?**“ |
| Planner (n168 / n111) | nur `use`: *„not departing yet, waiting for her. No go.“* | `[]`: *„‚Shall we go‘ is a question. No commands.“* — regelkonform |
| Erzähler | Dagny führt ihn zum Haus des Reeves (bekannter Ort `loc.causeway_hamlet.reeves_hall_the_green_door`) | Vessa führt ihn zu den Tannery Rows (wegen §2 als neuer Ort gemeldet) |
| Engine | `no_go` + 5 × `scene_context` (Werrin, Wissen) | `no_go` + 3 × `scene_context` |
| Nächster Narrator-Request (n172 / n116) | `CORRECTIONS` **vollständig**: „He is still at Dagny's blue-door house; he has not reached reeve's hall, the green door …“ | `CORRECTIONS` vorhanden, aber bei **400 Zeichen abgeschnitten** (`context.js:871`): „… he gets anywhe“. Der Kern ist erhalten |
| Spieler danach | „I give **Werrin** the account …“ (#111) | „Vessa, shall we drag the trail …?“ (#77) |
| Zweite Antwort | **Beginnt wieder in Dagnys Haus** („The bread went down warm …“) und geht dann **erneut** zum Reeve, weil der Spieler mit Werrin spricht | Wiederholt den Gang |
| Rückkehr | #114 ganz in Dagnys Haus, Werrin abwesend | #80 in der Gildenhalle; #81 echtes GO |

**Ursache:**
- **Erzähler:** Die Korrektur wird befolgt, die nächste Antwort setzt am richtigen Ort ein. Dann löst der Erzähler den Widerspruch zur Spielernachricht, die eine Person am unerreichten Ort anspricht, mit einer **erneuten** Reise auf. Er verstößt damit gegen „PLAYER ACTIONS are the complete upper bound … invent no additional … travel“.
- **Spieler:** Die LLM-Spieler-Persona sah im Status zwar „Location: … Dagny's blue-door house“, aber nur den kryptischen Hinweis `ENGINE REFUSED 6 reported changes (no_go, scene_context): see #audit`. Sie folgte der Erzählung.

**Enger, sicherer Rückführungsweg**, ohne `no_go` oder `scene_context` aufzuweichen und ohne aus einer Frage ein GO zu machen. Die Varianten in absteigender Eignung:
1. **Spielerhinweis statt Kürzel:** Bei abgewiesener Ankunft zeigt das Panel einen Klartext wie `NOT ARRIVED — Alaric is still at Dagny's blue-door house; the reeve's hall was not reached.` Das informiert nur, verändert keinen Zustand und hilft auch menschlichen Spielern.
2. **Gezielter Erzählerhinweis:** Wenn eine Bleibe-Korrektur aktiv ist und die Spielernachricht sich an eine Person oder Sache des abgewiesenen Ortes richtet: „he speaks to someone who is not here; answer it from where he is“. Das ist kein weiterer allgemeiner Satz, sondern ein Hinweis zum konkreten Konflikt.
3. **Kürzungsgrenze:** Die benannte Korrektur (`.187`) passt bei langen Ortsnamen nicht mehr in 400 Zeichen; Grenze für diese Zeile anheben oder den Text kürzen.

**Nicht empfohlen:** aus „Shall we go … now?“ automatisch ein GO zu machen. Das wäre Spielerhoheit gegen die bestehende Regel; höchstens eine Designentscheidung mit Gegenfällen.

**Im Vergleich zu `.186`:** Dort dauerte die Drift rund sechs Antworten (#117–#130, 21 `scene_context`), weil ein Rückzug verloren ging. Jetzt sind es zwei Antworten je Fall, und der Erzähler kehrt zurück. Das passt zur benannten Korrektur, ist aber bei zwei Fällen **kein Wirkungsnachweis**.

## 5. Mage #66–#69 – Bündelzeile ohne `lodging`: ein Etikettenfehler ohne Folgen in diesem Lauf

**Belege:**
- **#66:** Das Angebot `offer.t66.6` hat zwei Zeilen: `l1` „bed for the night“, 4 cp, `lodging`; `l2` „bed and stew with bread together“, 6 cp, `other`.
- **#67:** Der Spieler sagt „six copper for the bed and the stew“, der Planner wählt **nur `l2`**. Die Engine bucht −6 cp und `service.granted other`.
- **#69:** Schlaf `resolved` (1017 min), HP und MP voll. `pulse.rolled` am Gasthaus mit `frame: inside`, `p 5.25`, nicht offen.

**Wirkung von `lodging` im Code:**
- `paidLodging` liefert den `PAID HERE`-Kontext und den Schutz vor einer Doppelbuchung derselben Nacht.
- `pulse.js roofed()` zählt einen bezahlten Platz unter freiem Himmel als Dach.
- `world.js recover` lässt bei Unterkunft, Heilung oder Mahlzeit Erholung ohne Schlaf zu.

Für ein Gasthaus mit Innenraum zählt davon nur `PAID HERE`. Der Magier zog am Morgen weiter; **in diesem Lauf folgenlos**. Dauerhaft fehlt `PAID HERE` für eine zweite Nacht.

**Kleinste Korrektur (sinnvoll):** Den Vertrag präzisieren: Ein Bündel mit Bett ist `lodging`, eine Mahlzeit darin ist inbegriffen. Optional eine enge Abbildung: eine `other`-Zeile, deren Text ein Bett oder Zimmer für die Nacht nennt, wird bei der Gewährung `lodging`. Keine Zweitbuchung, keine Ableitung aus `#pay`. **Kein P1.**

## 6. Neu: Mage-Dungeonschleife #91–#102 – die Engine widerspricht sich selbst

**Ablauf:**
- **#90:** Ein NPC berichtet von einer „deep gallery below the worked galleries“ („where the floor slopes down“). Der Extractor legt sie als **berichteten Raum** im kanonischen Dungeon an.
- **#91, #95, #99:** dreimal `go` zu diesem Raum.
  - `commands.js:464` (`w.none && isRoom && !linksAt` → `explore`) **autorisiert** jedes Mal.
  - `dungeon.ahead` setzt jedes Mal den Boss-Slot `queen`.
- **Narrator-Request Turn 50 (n145, im FOCUS):**
  - `GOES — on to find a way to deep gallery …: he knows of it, not of a way there; he gets there only by a way the story shows him find (a stair, a door, a passage)`
  - `DUNGEON AHEAD (the engine's) — going on into a part of level 1 he has not seen: there he meets The Glimmer Queen … That is where this walk ends.`
- **Erzählung (#92, #96, #100):** jedes Mal ein alter Treppenweg **hinab** und die Queen.
- **Engine:**
  - #96: `passage` (`dir: down`) abgewiesen mit „**level 2 does not exist** in the canonical Dungeon Glimmerdeep Grotto“ (`levelVia`: `down` heißt Basis+1, `floorRefusal`). Die Ankunft folgt.
  - #92/#100: ohne gemeldeten Durchgang „he knows no open way“.
  - Der Slot wird nie materialisiert.
- **Spieler (#93, #97, #101):** Arcane Bolt auf das große Tier → `[SYSTEM // ATTACK — TARGET NEEDED] … not a valid target`.
- **Ausweg:** #105 geht er zurück; erst #111/#112 materialisiert die Engine die Queen über ein GO `{new}` in einen **neuen** Raum. Dort weicht er aus (#113); es gibt keinen Kampf.

**Einordnung:** Hier geht es nicht um Modellfolgsamkeit. **Drei Engineteile widersprechen sich:**
- Die Autorisierung (`explore`) lässt den berichteten Raum zu.
- Der Erzählerauftrag schlägt ausdrücklich „a stair“ vor und kündigt den Boss „of level 1“ an.
- Die Ebenenregel macht aus jeder Treppe hinab die nicht existierende Ebene 2.

Sechs Spielerzüge gingen verloren, das Bossziel war dreimal unerreichbar. Die Korrektur „level 2 does not exist“ war für Erzähler und Spieler unverständlich.

**Pflicht (eng):**
- Ein Raum, zu dem die Engine ein `explore`-GO **innerhalb von Ebene N** autorisiert und für den sie Ebene N als Ziel ankündigt, erhält Ebene N. Ein Durchgang „hinab“ darf ihn nicht auf eine nicht existierende Ebene heben; es gibt bereits Gegenfälle der echten Ebenenwechsel (Patch 8.3).
- Alternativ: Ohne tiefere Ebene verzichtet der Erzählerauftrag auf „a stair“.

**Tests nötig:**
- Ein Dungeon mit einer Ebene, ein berichteter Raum, eine Treppe hinab: Ankunft, Slot und Kampf.
- Ein Dungeon mit zwei Ebenen: Ebenenwechsel unverändert.
- Eine erzählte „level 2“ ohne GO: abgewiesen.

## 7. NPC E3, PULSE, Modellbudget

**E3:**
- **Anker:** 8/3/4 = **15** aus `fact.asserted` (`voice`, `manner`, `interest`), von der Runnerzählung bestätigt (`anchor_stored`). Später geändert 3/0/1, voll auf der Karte 5/3/1 = **9**.
- **Qualität der Stichprobe:**
  - **Gut:** Brannic Vell (`manner` #118 „weighing each word like figures in a column“) wird bei #120 genau so erzählt („the way a man listens when he's adding each word to a column“). Die Clerk-Anker passen.
  - **Situativ statt dauerhaft:** Vessa `manner` #88 („whispers … breathes slow through her mouth **on watch**“), Laternenfrau `voice` #116 („wary of the Queen, keeps glancing to the tunnel mouth“), `interest` #124 („watches the Glimmer Queen warily“).
  - **Falsches Feld:** Heiler `voice` #64 („dry joking manner, insists he carries no debts“).
  - **Überschreibung:** Dagnys `manner` wird zweimal binnen 20 Nachrichten ersetzt (#114 → #128 → #134).
  - Bilanz: etwa ein Drittel der Anker ist situativ oder steht im falschen Feld.
- **Folgerung:** beobachten. Keine neue Regel aus 15 Ankern; die Zahl stammt aus einer anderen Exposition und ist keine Buildwirkung, weil E3 seit `.183` unverändert ist.

**PULSE:**
- 60/49/35 = **144** Würfe, 11/9/4 = **24** offen; gegen `pulse.rolled` nachgezählt.
- Die Fensterhinweise des Runners bleiben Heuristiken. Es gibt keinen PULSE-Defekt.

**Budget** (eigener `budgetReport` über alle 638 Aufrufe):

| Rolle | n | Limit | Completion p50 / p95 / max | Reasoning-Zeichen p50 / max |
|---|---:|---:|---|---|
| Planner | 199 (+2 Reparaturen) | 2000 | 84 / 250 / 357 | 81 / 1.154 |
| Erzähler | 195 | 8192 | 465 / 745 / 1.051 | 215 / 2.321 |
| Extractor | 195 (+42 Reparaturen) | 4000 | 491 / 1.059 / 1.702 | 531 / 3.786 |

- **Befund:** 638/638 `stop`, 0 leer; kein Extractor-Aufruf über 75 % seines Limits.
- **Ausreißer:** In `.186` erreichten die Abbrüche 15.000–33.000 Reasoning-Zeichen, und das auf **beiden** Provider-Fingerprints (FOCUS-Auszug `.186`: `fp1-nst-nes` 20, `fp1-neb-api` 4). In `.188` liegt das Maximum bei 3.786; die Mediane sind ähnlich (258 gegenüber 292). Der Ausreißer fehlt, die Ursache ist unbelegt.
- **P1f:** Der Pfad (leere `length`-Antwort des Planners) trat **nie** ein; beide Planner-Reparaturen des Magiers waren gewöhnliche. Kein Erfolgsnachweis für P1f.

## 8. Spielintegrität insgesamt

| Bereich | Befund |
|---|---|
| Event-/Foldintegrität | Eigener Fold mit `.188`: 0 Foldfehler, 0 Validierungsprobleme in allen drei Läufen |
| Zahlungen | Alle Bewegungen belegt: Registrierungen −20, Gildenlöhne +45/+35, erzählt übergebene Vorschüsse +60/+50 als `coin.gift`, Verkauf +26, Käufe −4/−12/−6/−1. `coin_already_received` verhindert bei Mage #58 eine doppelte Gutschrift |
| Gildenaufträge | Warrior „A Big One in the Eel Carts“, Rogue „Cull the Stray Hound“ regulär abgeschlossen und ausgezahlt; Mage-Abgabe richtig abgewiesen („level 1: not cleared yet“) |
| Monster/Dungeon | `dungeon_foe`/`creature_continuity` korrekt (Schleime, freie Queen-Meldung); siehe aber **§6** |
| Kontinuität | **Doppelter Ort und doppelter NPC** im Rogue-Lauf (§2) als bleibender Inhaltsfehler im Endzustand |
| Nebenbefund | Warrior #109 `use: not_held` für das servierte Brot, das „On the ground“ liegt: Essen auf dem Tisch verlangt erst ein `take`. Klein, beobachten |

**Technische Fortsetzbarkeit gegenüber inhaltlich korrektem Rollenspiel:** Alle drei Läufe sind technisch einwandfrei fortsetzbar. Inhaltlich gingen verloren:
- rund **6 Mage-Züge** (Dungeonschleife),
- **3 Rogue-Züge** (#98) und je **2 Antworten** Drift in Warrior und Rogue,
- im Rogue ein **doppelter Ort und NPC**, die bleiben.

Es gab keinen Geldverlust.

## 9. Vergleich `.186` → `.188`

| | `.186` | `.188` |
|---|---|---|
| Inputs / Enden | 70/70/70, done | 70/70/70, done |
| Eventgruppen / Events | 362 / 2.991 | 402 / 3.361 |
| `finish=length` | 69 Aufrufe (16 Planner, 45 Extractor am ersten Aufruf) | **0** |
| Terminale Extraktionen | 2 (Warrior #58 Schema nach zwei leeren Versuchen, #126 dreimal leer) | 2 (Rogue #80 **Engine-Katalog**, #98 Modell-Zusatzschlüssel) |
| Falsch gerichtetes Geld | **ja** (Rogue −14 cp) | nein |
| Ortsdrift | Warrior rund 6 Antworten (verlorener Rückzug) | 2 × 2 Antworten (Vorschlag), Rückkehr nach der Korrektur |
| Dungeon | Monster A2 natürlich geprüft | **Schleife durch Selbstwiderspruch** (§6) |
| Kontinuität | – | doppelter Ort und NPC (§2) |
| E3-Anker / PULSE | 3 / 93 Würfe, 21 offen | 15 / 144 Würfe, 24 offen |
| Unterkunft | `#pay` ohne `lodging` (Kette aus `with: null`) | Bündel `other` (folgenlos) |

Die `.187`-Ziele (P1, P2, P1f) zeigen keine Gegenbelege. Natürlich bestätigt ist aber nur das Ausbleiben der alten Fehlerformen; die Auslöser kamen nicht vor.

## 10. Prioritäten

| Stufe | Befund | Engste Maßnahme |
|---|---|---|
| **Pflicht** | §6 Mage-Dungeonschleife | Ein per `explore` angekündigter Raum innerhalb von Ebene N behält Ebene N, auch über einen Durchgang „hinab“. Tests: eine Ebene / zwei Ebenen / erzählte Ebene ohne GO |
| **Pflicht** | §2 Orts-ID im Kontext, aber nicht referenzierbar | `COMPLETED TODAY`-Jagdorte (und besuchte Stätten der Route) gültig machen; Gegenfälle Dungeonraum/unbekannter Raum; prüfen, dass #76–#82 dann den bestehenden Ort und NPC treffen |
| **Sinnvoll** | §4 Drift nach Vorschlag | Klartext-Panel `NOT ARRIVED — still at …`; gezielter Erzählerhinweis bei Ansprache einer Person am unerreichten Ort; Kürzungsgrenze der benannten Korrektur. **Kein** automatisches GO aus Fragen |
| **Sinnvoll** | §3 `expected`-Zusatzschlüssel `null` | Nur nicht angeforderte `null`-Schlüssel vor der Prüfung verwerfen; Schlüssel mit Inhalt bleiben ein Fehler |
| **Sinnvoll** | §5 Bündel mit Bett | Vertragszeile „ein Bündel mit Bett ist `lodging`“; optional enge Abbildung; keine Zweitbuchung |
| **Beobachten** | E3-Ankerqualität, P1f-Wirkung, R1/R2, `not_held` für Serviertes | Nur mit neuen natürlichen Belegen |
| **Nicht notwendig** | Payment-Umbau, Tokenlimits, PULSE, A2, E3-Regeln | – |

## 11. Nachweisgrenzen

- **Mage #91–#96:** Die Rohrequests fehlen im Auszug. Dass auch dort `DUNGEON AHEAD` die Queen nannte, folgt aus den `dungeon.ahead`-Events, nicht aus dem Prompttext. Turn 50 ist im Wortlaut belegt.
- **Gegenproben:** `catalogPlaces`, Fold und Validierung liefen isoliert gegen `823fd6f`. Die vorgeschlagenen Korrekturen sind **nicht** implementiert oder getestet.
- **Erzählerverhalten:** Nach einer verbesserten Rückführung bleibt es eine Modellfrage. Zwei Fälle mit Rückkehr nach zwei Antworten belegen keine Wirksamkeit.
- **`.189`:** in diesem Lauf nicht natürlich ausgeführt.

## 12. Empfehlung für den nächsten Entwicklungsschritt

**Ein kleiner gezielter Patch vor der nächsten Phase**, mit zwei getrennten Pflichtteilen, beide deterministisch am Original reproduzierbar:
1. **Dungeonschleife (§6):** am Mage-Zustand #90/#99.
2. **Referenzierbarkeit genannter Orte (§2):** am Rogue-Zustand #79/#81, mit Prüfung auf Ort- und NPC-Duplikat.

Die Spielerhinweise zur Drift (§4) passen als dritter, rein informativer Teil dazu. §3 und §5 sind optional.

Danach **kein langer Dreierbatch, sondern ein kurzer natürlicher Lauf** mit Dungeon-Erkundung (berichteter Raum) und einer erledigten Jagd mit Rückkehr an den Jagdort. Er prüft zugleich `.189`, dessen R1/R2 bisher nur geskriptet geprüft sind. Payment, Monster, PULSE und E3 brauchen aus diesem Batch keinen Eingriff.

**Keine Produktänderung durch diesen Review.**
