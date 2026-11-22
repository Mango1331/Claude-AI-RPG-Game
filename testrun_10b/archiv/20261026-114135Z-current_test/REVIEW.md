# Run 21 – F-Progression auf Build .97: Habitatbindung und Extractor-Abbruch

**Original:** [20261026-114135Z-current_test.zip](20261026-114135Z-current_test.zip), **15.370.309 Bytes**, **SHA-256 a25e0a59505babd76345155fc489a142889a3d5998d3ad0062348e7887cb2a4b**. Alle **15** ZIP-Einträge gelesen, CRC-Prüfung ohne Fehler. **Nachtrag:** Die unveränderte ZIP liegt jetzt auch auf `main`. GitHub-Blob **`cc3c214c6ddfa680b07ce454e798ac0236a6d05f`** stimmt exakt mit dem aus der lokalen Originaldatei selbst errechneten Git-Blob überein: **Binärarchiv byteidentisch verifiziert**.

**Stand:** 26.10.2026. Produkt **4.3.0-c.6.6.97**, [b51a6f1](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b51a6f1d44415a00a71162bcec0b0c0b46349ac3), V4-C / Ruleset 2, echte neue Kampagne mit campaign.started.f_progression=true, Mage (Arcane Bolt, Blink), Basisstats 7, XP ×2. Echter ST1.19-/GLM-5.3-Flash-Lauf, stub:false, keine Fixture. Ziel Level 15 (100 Eingaben als Zwischenmarke, 1.000 Inputs / 24 h Sicherheitslimit).

**Prüfumfang:** run.json, evaluation.json, report.md, **170 Nachrichtenrecords mit 1.335 Engineevents**, alle **264 Callmetadaten und Completion-Rohantworten**, relevante chat.jsonl/player.jsonl, Original-T90-Erstantwort und Repair sowie die Produktpfade für Materialisierung, Guild, World, Catalog, Extractor. **Unabhängige Analyse des Originals, keine selbst ausgeführte Node-/ST-Suite, kein Produktpatch.** Narration ist keine Enginebuchung.

> **Sol-Gegenreview vom 26.10.2026, gegen unveränderte `.97`-Basis:** Die Original-Wolfsfälle wurden durch den zu breiten `dungeonOf()`-Guard in `materialise()` reproduziert; `wolf`/`gray wolf` passen zusammen und `populationAt()` erkennt das korrekte Habitat. Das T90-Original-JSON besteht nach **alleiniger Aufnahme der bereits gebuchten Hunt-Site-ID in den erlaubten PLACES-Katalog** sämtliche Schema- und Vollständigkeitsprüfungen und lässt sich im Worldpfad anwenden. 14/14 Kämpfe enthalten `pp.threatened:false`; der Board-Repair hat einen nicht weitergereichten Detail-Ablehnungsgrund. Diese Gegenprüfung umfasst **gezielte Sonden**, keine neue vollständige Testsuite und keinen Produktfix.

## 1. Kurzfazit und Kennzahlen

**Der neue F-Rang-Vertrag wird angelegt, aber die Verbindung Population → Gegnerlevel → Guild-Zähler scheitert im natürlichen Wolfsverlauf.** Die feste L4–7-Wolfspopulation existiert. Trotzdem bleiben zwölf tatsächlich besiegte Wölfe L1–3, ohne einzigen Herkunftsbeleg, und die Quest steht noch auf **0/4**. Daneben stoppt T90 wegen zweier unterschiedlicher **Schemafehler bei normal beantworteten Extractor-Calls** (kein Timeout).

| Kennzahl | Wert |
|---|---:|
| Eingaben / reguläre Engine-Turns | **90 / 84** (6 Erstellung-/Systemschritte zählen anders) |
| Dauer | **42:25 min** gesamt, 33:51 min Spielphase, 5:41 min Playerentscheidungen |
| Ende | **T90 extractor_failed**; letzter World-Reply nicht angewendet |
| Charakter | Mage **L4**, **636** kumulative XP (**590 Kampf + 46 Quest**), **36 Rest-XP** bei L4 |
| Kampf | **14 Siege/14 Encounter**, **14** Gegner getötet; kein Tod |
| Gegnerlevel in Siegen | L1 **6**, L2 **7**, L3 **1**, kein L4–7 |
| Gildenabschlüsse | **1**, zweiter Vertrag ACTIVE **0/4** |
| Geld | **55 cp**: 50 Start –20 Registrierung +25 Guild-Payout |
| Zustand vor gescheiterter World-Antwort | HP **105/110**, MP **128**, Startergear |
| Events | **1.335**, 81 extract.applied, 1 extract.failed, Status **integrity OK** |
| Engine-/Narrator-Aufrufe | **264**: 87 Planner, 82 Narrator, 92 Extractor, 3 Board |
| Repairs | 2 Planner, 10 Extractor, 1 Board |
| Hostfehler | **0** Browser-PageErrors, **0** ServerErrors |

Der Export bildet nur einen **90-Input-Mage-Lauf** ab, keinen abgeschlossenen L15- oder Klassenvergleich. Die nachfolgenden P1-Befunde sind jedoch reproduzierbare Integrationsdefizite und keine allgemeine Balanceprognose.

## 2. P1 – F-Habitatbindung für Wolfsjagd nicht wirksam

### Gebuchte Weltangebote: F-Bandbreite ist real

**T5:** Erstantwort und Repair des Boards schlagen an der vorgeschriebenen Intro-Jagd (ein schwacher L1-Gegner) fehl; board.failed, keine Teilveröffentlichung. **T6:** neues vollständiges Board:

| Auftrag | Empfohlen | Gebuchtes Habitat/Level | cp |
|---|---:|---|---:|
| Eel-Weir Bog Striders | 1 | Bog Strider, **1–1** | 25 |
| Thin the Mill Road Wolves | 4 | Wolf, **4–7** | 80 |
| Quarry Ridge Boars | 9 | Great Boar, **8–11** | 150 |
| Old Ford Bear | 13 | Grey Bear, **12–14** | 200 |
| Glimmerdeep Grotto Level 1 | 1 | Dungeon-Slots, kein Outdoor-Habitat | 40 |

Die Worldevents **i11** legen **quest.thin_the_mill_road_wolves** mit **DEFEAT 4 wolves** und **quest.hunt.at = realm.caelreth.the_mill_road_treeline_east_of_barrowford** an. Genau dieser Site erhält **population={species:"wolf",anchor:"wolf",levels:[4,7]}**. Die F-Policy im Kampagnenstart ist explizit **true**.

### Belegter Ausfall trotz erreichter Originalpopulation

T19 nimmt den Wolfsvertrag an. In **T26, T32, T38, T40, T41, T48, T54, T56, T65, T68, T71, T78** gewinnt der PC **zwölf** einzelne Wolfskämpfe. Die eingefrorenen Level lauten **1, 1, 1, 2, 2, 2, 1, 2, 1, 2, 3, 2**. **Keines** dieser zwölf entity.updated-Profilereignisse weist **population_at** aus. Die T90-Extractor-Anfrage bestätigt als kanonischen Queststand **defeated (engine count): 0 of 4 wolves**.

Nicht jeder Kill muss zählen: Barrowford, die Streambank, der Quarry und freistehende Wilderness-Orte sind nicht automatisch Teil desselben Habitats. **Aber** die Fehlzuordnung tritt sogar **am richtigen Ort** auf:

- **T30 / i60:** Ankunft im exakt gebuchten **realm.caelreth.the_mill_road_treeline_east_of_barrowford**. Die daraufhin eingeführte **loc.wolf_den_split** ist dessen Unterort.
- **T31 / i62 (User-Input-Zählung; Assistantantwort nach Engine-Turn 29):** **mon.wolfragged_ear**, species **gray wolf**, wird im dortigen Den-Split als **L1** materialisiert; **met_at=loc.wolf_den_split**, **kein population_at**.
- **T37 / i74** und Kampf T38: Die Engine bucht eine Rückkehr **exakt in den gebuchten Treeline-Site**; der dort entstandene **mon.monfeeding_gray_wolf** wird **L1**, mit **met_at=realm.caelreth.the_mill_road_treeline_east_of_barrowford**, **kein population_at**. **Dieser Fall ist ein besonders enger Original-Repro**.
- **Kontrolle T15 / i28:** Bog Strider am eigenen Population-Site erhält korrekt **L1 und population_at=realm.caelreth.the_eel_weirs_of_the_reed_flats**. Der Populationmechanismus funktioniert grundsätzlich, aber nicht in dieser Wolfs-Livekette.

**Sicher nachgewiesen:** Der Habitatmarker fehlt selbst bei einem natürlichen Gray-Wolf-Kontakt am exakt passenden Site, und damit fehlen sowohl L4–7-Profil als auch Questnachweis. **Ursache bestätigt:** In `src/engine.js:materialise()` steht der Guard `s.meta.f_progression && !dungeonOf(s, at)`. `dungeonOf()` erkennt nicht nur wirkliche Dungeons, sondern auch gewöhnliche raumweise erkundete Komplexe (`rooms:true`). Das Anlegen des Wolfbaus gibt dem zugehörigen Treeline-Habitat diesen Navigationsmarker; dadurch wird die ansonsten **funktionierende** `populationAt()`-Prüfung übersprungen. **Sol-Gegenprobe:** Entfernen dieses bloßen Navigationsmerkmals aus dem isolierten Ausgangszustand führt bei den Originalkontakten zu **L5 bzw. L4 mit korrekt gebuchtem `population_at`**. Der Produktcode besitzt bereits `trueDungeonOf()`, das auf eine tatsächliche Dungeonklassifikation (`dungeon.real`) prüft. Artzuordnung und bestehender strenger Questzähler sind **nicht defekt**.

**Fachpatch P1 – kleiner Guardfix:** Originalfälle **T31/i62 und T37/i74** auf unveränderter `.97` rot. In `materialise()` nur die **Habitat-Ausschlussbedingung** von gewöhnlicher Raumnavigation auf tatsächliche Dungeonautorität begrenzen; nicht die übrigen `dungeonOf()`-Nutzungen für Wege/Orte umbauen. Danach passende Wolfskontakte **L4–7 plus `population_at`**, Killzähler nach wirklich gebuchtem besiegten Individuum **genau +1**. Echte Dungeons, fremde Wölfe/Arten/Orte, bereits profilierte Individuen, Legacy und Replay absichern. Alte Kampagnen/Profiles nicht nachträglich ändern.

**World-Kontinuität als zweiter Teil:** Die Erzählung verfolgt Wölfe über Treeline, Streambank, Quarry, Alder Dip und Den. Viele neuen Wilderness-Orte liegen als **Geschwister unter realm.caelreth**, nicht im Pfad des Ziel-Sites. Es ist zu prüfen, wie eine **tatsächlich belegte Wanderung identischer Wölfe** ihren fixierten population_at behält und wie wirklich neue Fremdwölfe von ihnen unterschieden werden. Keine freie Herkunft aus Narrator-Sätzen und kein Monster-Teleport.

## 3. P1 – T90: Extractor-Katalog und Schema-Repair versagen nacheinander

**T90-Spielerhandlung:** Tagsüber vorbereiten, zum nördlichen Treeline-Rand reisen, einen geschützten Wachplatz suchen und bis nach Einbruch der Dunkelheit warten. Narrator erzählt eine günstige Mulde hinter einer niedrigen Mauer und unbestimmte Wolfszeichen; **keinen Kill, keinen Questabschluss**.

**Call 263, Erstantwort:** **9.495 ms, finish=stop**. Das JSON ist syntaktisch gültig. Für scene, expected[2].at und arrive.at wählt das Modell den **bereits existierenden, im Questtext ausdrücklich als Ziel genannten** ID **realm.caelreth.the_mill_road_treeline_east_of_barrowford**. Obwohl derselbe ID in der **QUESTS-Beschreibung** derselben Anfrage auftaucht, steht er **nicht in den zugelassenen PLACES-Referenzen** des Extractor-Katalogs. Der Validator meldet **$.scene**, **$.expected.2.at**, **$.deltas[1] (arrive).at** als nicht erlaubte Place-Refs. Das ist **eine Katalog-/Referenzinkonsistenz**, nicht bloß ein erfundener Ortsname.

**Call 264, Repair:** **5.622 ms, finish=stop**. Der Extractor wechselt auf ein **neues** Wilderness-place-ref-Objekt mit parent loc.barrowford. In zwei fact-Deltas benutzt er genau dieses Place-Ref-Objekt jedoch als Subjekt **fact.s**, das ein **String** sein muss. Abschließende Validierungsfehler **$.deltas[3] (fact): .s: expected string, got object** und **$.deltas[4] (fact): .s: expected string, got object**; **extract.failed** nach **15.133 ms**. Es gab weder HTTP-/Providerfehler noch 120-s-Timeout oder äußere Cancellation. Die .97-Transportdiagnostik ist hier nicht ursächlich.

**Fachpatch P1 – primär Katalog statt Recovery:** Sols Gegenprobe: Fügt man **nur** die im Questkontext genannte und wirklich existierende Hunt-Site-ID zu den erlaubten **PLACES** hinzu, ist die **unveränderte erste Antwort Call263 vollständig schema- und expected-valid**; auch die World-Ankunft wird angenommen. Deshalb die **relevanten aktiven Questzielorte** in den gemeinsamen validierbaren Ortskatalog projizieren, mit bestehenden Budget-/Prioritätsgrenzen. Der bestehende **einmalige Repair** soll bei tatsächlichen Fehlern unbekannte Ortsreferenzen, Chronologie und `fact.s:string` statt place-ref-Objekt **unterscheiden**, ohne zusätzliche Anfrage, Schemaaufweichung oder gefälschte Ortsbewegung. Original-Calls263/264 als gezielte Rot/Grün-Regressionskette; Replay/Swipe-Einmaligkeit bewahren.

**Teilbuchung präzisieren:** Der User-Record **i179** enthält **check.recorded**, **time.advanced 865 min**, vier cmd.resolved und outcome.recorded. Die letzte Assistant-World-Antwort **i180** enthält nur **extract.failed**; **keine** Ankunft/Fakten/Threads/Questbuchung. Nicht behaupten, T90 habe insgesamt keinerlei Engineänderung vorgenommen.

**P2 – GO→SEARCH-Chronologie:** Die nach der geplanten Reise gewünschte Suche eines Verstecks wird bereits als erfolgreicher **PER-Check am Ausgangsort loc.barrowford.the_shepherds_house** gebucht; der Erzähler verwendet diesen Erfolg für den noch nicht erreichten Treeline-Zielort. Sequenzierte Suche muss an eine wirklich erreichte Szene gebunden sein oder als zukünftige bedingte Handlung gelten. Auch Fehlerfall, Swipe und nicht erreichte Ankunft testen; die Würfelprobe allein autorisiert keine neue Position.

## 4. Sonstige Befunde und positive Abläufe

- **Gilde korrekt:** T3–4 Guild-Ankunft und exakt einmal **20 cp** Registrierung. T7–16 Bog-Strider-Cull angenommen; echte READY-Buchung, T16 am Glassmere-Guild-Hall **proof.checked(ok:true)**, **+25 cp und +46 Quest-XP**, Level 2. Keine Doppelzahlung.
- **Primer erhältlich, Kauf noch nicht getestet:** Ein tatsächlich anwesender Clerk veröffentlicht fünf **F-C1-Primer à 120 cp**. T20 möchte der Spieler einen Primer of Bolt erwerben, besitzt aber nur **55 cp**; korrekterweise keine Buchzahlung und kein Gratis-Skill. Lernen/LP daraus nicht getestet.
- **Integrität/Technik:** **integrity OK**, keine Host-PageErrors, keine 900-s-pending-Schleife. Kein tatsächliches repriced-Ereignis und kein Wethervord-Guild-Mehrschrittfälle im Run; die anderen .97-Fixes sind daher nicht durch diesen Live-Lauf erneut bewiesen oder widerlegt.
- **Board P2, nun konkrete Diagnose:** T5 enthält als Intro-Jagd einen **unzulässigen Outdoor-Habitat-Eintrag innerhalb eines Dungeons**; dieser einzelne Eintrag wird zurecht verworfen. Der Repair sieht jedoch nur die **Folgewirkung** „Intro-Jagd fehlt“, **nicht** den zeilenspezifischen Ablehnungsgrund, und korrigiert stattdessen die Gegnerzahl. Deshalb scheitert auch der Repair; T6 liefert ein gültiges L1/L4/L9/L13-Board. **Nur vorhandene detaillierte `refused[].why`-Hinweise an den Board-Repair weitergeben**, keine neuen Boardregeln oder zusätzliche Reparaturversuche. Häufigkeit über weitere Seeds prüfen.
- **Combat:** **14 von 14** Encounter jeweils nur **ein Gegner**; im Worldzustand wurden zeitweise mehrere Wölfe und Gruppen angelegt, etwa T64/i128. Ob dies auf korrekte Taktik/Hinterhalte/Flucht oder fehlende Gruppenaktivierung zurückgeht, ist aus bloßen Fight-Anzahlen nicht beweisbar. Im Lauf kein belegter HP-Verlust durch Wolfskämpfe; Erholung von HP90 auf 95 und 105. Das ist **kein** Balanceurteil über die nicht materialisierten L4–7-Wölfe.
- **Skills/Growth:** Bolt als bevorzugter Angriff, Blink mehrfach in der Spielerhandlung erwähnt; **keine Skill-PP-Buchung** im Eventexport und keine neue erlernte Technik. **Kein Growthdefekt:** Alle **14** Original-Encounter enthalten `pp.threatened:false`; die Gegner kamen zu keinem Angriff. Unter den bestehenden `fightQualifies()`-Voraussetzungen sind diese Siege **regelkonform nicht PP-qualifiziert**. Keine PP nachträglich vergeben und keine Growth-Regeln ändern. T86 wird eine **Ordinary-INT-Passive-Eigenpraxis** eröffnet, **40/200 LP**, keine erworbene Passive.
- **Gear/Ökonomie:** Kein Kauf oder Equip-Upgrade, daher kein natürlicher Gearvergleich. Die 55 cp reichen für einen Primer à 120 cp nicht. Stärkere freiwillige F-Jagden sind am Board vorhanden, aber in der natürlichen Monster-/Questkette **nicht mechanisch erreichbar**.
- **Zeitaufwand:** Der zweite aktive Vertrag bestimmt faktisch T19–T90: viele Ortswechsel, Rückfragen, Nachtwachen und zwölf Wolfssiege ohne Fortschritt am 4er-Ziel. Diese Friktion ist mit dem fehlenden Populationsbeleg verbunden, nicht einfach „der Tester spielt falsch“.

## 5. Priorisierte Folgearbeit

**P1-A – Habitatbindung:** **T31/i62, T37/i74** reproduzieren. `materialise()` verwendet für den Habitat-Guard irrtümlich `!dungeonOf()`, das auch gewöhnliche `rooms:true`-Orte erfasst. Ausschluss nur für **echte Dungeons**, ansonsten L4–7 und Herkunftsmarker; ein tatsächlicher Kill = **+1**. Echte Dungeon-Slots, Fremdgebiete, andere Arten, bereits profilierte und Legacy-Kreaturen als Negativkontrollen. Kein neues Orts-/Questmodell.

**P1-B – T90 Catalog/Extractor:** Der existierende Hunt-Site ist in QUESTS, nicht im erlaubten **PLACES**-Set. Ergänzung **nur dieser bereits bekannten ID** macht das originale **Call263-JSON ohne andere Änderung valide** und die Ankunft buchbar. Katalogauswahl gezielt verbessern; nur bei weiterhin nötigen Repairs Referenz-/Chronologie-/`fact.s`-Typfehler unterscheiden. Einmaliger Retry bleibt.

**P2-C – Mehrteilige GO→SEARCH-Probe und Ortskontinuität:** Vorabcheck am Ausgangsort gegen tatsächlich besuchten Zielort, sichere Reihenfolge, verfolgte identische Rudelmitglieder über verschiedene Orte, keine automatische Herkunftsfälschung.

**P2-D – Board-Diagnostik und weitere natürliche F-Abnahme:** Intro-Boardstabilität über Seeds, echte Gruppengefahr und L4–7/L8–11/L12–14, Primer/Studium, echter Gearkauf und PP-Qualifikation, danach Warrior/Rogue. Weder XP ×2 noch Startstats oder generelle Waffenwerte aus diesem beschädigten Sample pauschal verändern.

**Empfehlung:** Die **beiden nun klar lokalisierten P1-Probleme** jeweils als kleinen Fachpatch mit Original-Rot/Grün-Kontrolle beheben, dann erneuter Live-Lauf auf neuer Kampagne. Board-Diagnose und GO→SEARCH sind eigenständige P2-Folgearbeiten. Keine Implementierung durch dieses Review, keine Änderungen an Balance/Runner. **Original-ZIP liegt byteidentisch auf `main`.**