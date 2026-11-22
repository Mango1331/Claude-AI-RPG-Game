# Avereth Engine – unabhängiger GPT-Review des natürlichen Dreierbatches .188

**14.11.2026 · Originaldaten unabhängig eingelesen.** Produktstand des **getesteten Laufs:** `4.3.0-c.6.6.188`, `823fd6f54c06`, unveränderte Personas/Seeds 7,8,9. Zum Zeitpunkt dieser Aktenpflege lag der **aktuelle Remote-Produktbranch bereits auf .189** (`4438241`); **dieser Batch enthält keinerlei natürliche .189-Ausführung**. Der Originalupload, SHA-256-Werte und die Auswahl des reduzierten Gegenreview-Pakets sind in [SOURCE_MANIFEST.md](SOURCE_MANIFEST.md) dokumentiert. Vergleichsstand: [natürlicher .186-Dreierbatch](../npc-20261114-094810Z/REVIEW.md) samt [Opus-Gegenreview](../npc-20261114-094810Z/GEGENREVIEW_OPUS.md); Produktänderungen [Build .187](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/bd52d2f/avereth-engine/docs/BATCH186_FIXES_187.md), [.188/.189](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4438241/avereth-engine/docs/FOLLOWUP_187_189.md).

## 1. Kurzurteil

**Drei 70-Input-Kampagnen technisch regulär beendet; sehr gute Modellbudget-Stichprobe und deutlich mehr NPC-E3-Daten, aber keine vollständige Weltkontinuitäts- oder Extractor-Abnahme.**

- **Positiv:** Alle drei Runs `done`, 70 Inputs pro Klasse, 0 Browser-/Serverfehler, Profile unverändert. **638 Provider-Aufrufe, null `finish=length`, null leere Antworten**. Zwei Gildenaufträge wirklich abgeschlossen/ausbezahlt (Warrior/Rogue). Gebuchte Geldrichtungen in den untersuchten Transaktionen nachvollziehbar; keine neue −14-cp-Fehlbuchung.
- **Wichtiges Negativ:** Rogue **zwei endgültig nicht angewendete Extractorantworten** (Chat #80 und #98), obwohl das Modell jeweils nach einer Korrekturanfrage erneut mit **`finish=stop`** antwortete. Kein Runabbruch, aber verlorene Weltberichte und bei #98 eine tatsächlich autorisierte Ankunft, die nicht gebucht wird.
- **Ebenfalls negativ:** Fortgesetzte *erzählerische Ortsdrift trotz benannter Stay-Korrektur*, natürlich im Warrior und Rogue erneut beobachtet. Engine-`no_go` und `scene_context` schützen die gespeicherte Welt; der Narrator ignoriert aber teils den kanonischen Standort und Personen/Absprachen im unerreichten Ort können wiederholt erzählt werden.
- **Semantischer Zahlungs-/Dienstleistungsrest:** Mage bezahlt 6 cp korrekt für „bed and stew with bread together“, doch die Extractor-Offerte setzt die Bündelposition `service: other`; die Engine speichert nur `service.granted other`, **keine `service.granted lodging`**. Kein unautorisierter Geldverlust, aber **Unterkunftsanspruch/PAID-HERE-Kontext fehlt**.
- **NPC E3:** **15 natürlich gespeicherte Anker** gegenüber 3 bei .186; 9 davon später vollständig, 3 gekürzt ausgeliefert. Reale Wiederbegegnungen und Dialogbezüge, aber die Rate stammt aus anderer Handlungsexposition – **keine kausale E3-Produktverbesserung** (an E3 wurde seit .186 nichts geändert).
- **Explizite Nachweisgrenze für R1/R2 der .188-Nachkorrekturen:** Kein entsprechender `work_not_purchase`-Fall mit entgegengesetzter Geldrichtung im natürlichen Log, und kein klarer Runnergegenfall „a few paces, stay here“ mit der aus .187 bekannten LONG-/Verlaufs-Konstellation. Die beiden gezielten Hostregressionen sind die Abnahme für diese Regeln; der natürliche Batch testet sie **nicht direkt**.

**Priorität:** Kein allgemeiner Geld- oder NPC-Umbau. Vor einer erneuten großen Serie zuerst die beiden Rogue-Extractorfehler und die fortgesetzte Ortsdrift anhand der vorhandenen Originalrequests gegenprüfen. Mage-Bündelservice unabhängig als begrenztes P2-Thema verfolgen. Die 0 `length`-Antworten sind ein guter Befund, kein Beweis für Wirkursache P1f.

## 2. Originalquellen, Zählung und technische Integrität

| | Warrior `npc-sociable` | Rogue `npc-wary` | Mage `npc-inquisitive` | Summe |
|---|---:|---:|---:|---:|
| Inputs / Endgrund | 70 / done | 70 / done | 70 / done | **210** |
| Chatnachrichten (ohne JSONL-Metadaten) | 141 | 141 | 141 | **423** |
| Exportgruppen = Chat-Records | **138/138** | **136/136** | **128/128** | **402/402** |
| Engineevents | 1.139 | 1.120 | 1.102 | **3.361** |
| Aufrufe `calls.json` | 219 | 215 | 204 | **638** |
| `finish=length` | 0 | 0 | 0 | **0** |
| Extra-Extractor-Reparaturaufrufe | 16 | 15 | 11 | **42** |
| Endgültig fehlgeschlagene Worldauswertungen | 0 | **2** | 0 | **2** |
| Browser-/Serverfehler | 0/0 | 0/0 | 0/0 | **0/0** |

**Eigene Prüfung:** ZIP wirklich geöffnet; `batch.json`, drei `run.json`, `evaluation.json`, `npc-pulse.json`, alle 423 Chatobjekte, 402 Eventgruppen und 638 `calls.json`-Records eingelesen. Jede `avereth-events.json`-Gruppe wurde mit dem `extra.avereth.events`-Array des zugehörigen Chatindexes als JSON-Struktur verglichen: **402/402 gleich**. Einzelne `chat-completions.jsonl`-Originalrequests und -Antworten wurden zusätzlich für den Rogue (#80/#98), die Reisebrüche und den Mage-Kauf eingesehen. Runner meldet `integrity.ok`, `foldErrors=[]`, `problems=[]` bei allen; **kein eigener Node-`foldChat` oder ST-Smoke neu ausgeführt**. `done` heißt 70 Inputs, nicht „alle Handlungen korrekt“.

**Spielentwicklung:** Warrior schließt den Auftrag *A Big One in the Eel Carts* ab (45 cp Gildenlohn), Rogue *Cull the Stray Hound at the Tannery Rows* (35 cp Gildenlohn). Mage erkundet Glimmerdeep Grotto und nimmt einen Dungeonauftrag an, aber `quest_completed` bleibt `false`. Kein erzwungener Kampf-/NPC-/Questweg der Runnerpersona.

## 3. R1: Keine erneute verkehrt gerichtete Geldbuchung, jedoch kein natürlicher Nachweis des Arbeitsrichtungs-Fixes

**Ereignisbasierte Kontenbewegungen:**

- **Warrior:** Gildenregistrierung −20 cp, Gildenlohn +45 cp, von Brannic Vell wirklich übergebener Arbeitsvorschuss +60 cp, von Dagny tatsächlich ausgezahlter Vorschuss +50 cp; Kontostand folgt 50→30→75→135→185 cp. Die beiden Vorschüsse sind **im Original ausdrücklich als ausgezahlte Gegenleistungen** erzählt, keine von der Engine eigenmächtig vorzeitig erzeugte Auszahlung.
- **Rogue:** Registrierung −20 cp, Questlohn +35 cp, gekaufte Leine −4 cp, später Boots-/Tuchbündel −12 cp; Kontostand 50→30→65→61→49 cp.
- **Mage:** Registrierung −20 cp, Dungeongebühr −10 cp, korrekt gebuchter Verkauf der acht Chitinplatten **+26 cp**, Gaststätten-Bündel −6 cp und später ein separat angebotenes Brot −1 cp; 50→30→20→46→40→39 cp.

**Weder eine Rückbuchung noch eine neue Fehlbelastung wie Rogue −14 cp ist nachweisbar.** Die zwei privaten Warrior-Vorschüsse werden als `coin.gift`/zugeordnetes `transaction.completed to:pc` verbucht; aus reinen Zusagen wurde keine unbewiesene Auszahlung konstruiert. Die drei Läufe enthalten laut Event-Filter **kein einziges `work_not_purchase`**. Der Kauf eines selbst arbeitenden, angeheuerten Jägers und der alte Rogue-Belohnungsfehler wurden also **nicht** in einem natürlichen, vergleichbaren Auslöseszenario gegeneinander ausgespielt. Die Tests des Builds sind dafür die richtige getrennte Evidenz, aber keine natürliche Wirkungsmessung.

### 3.1 P2: Mage kauft Unterkunft *und* Essen als `service: other`

**Mage Spielerinput I33 / Chat #65–#70; entscheidend #66–#69:**
- #65 wählt den Weg zur Dented Kettle und erklärt, ein Bett und Eintopf mit Brot zu wollen; die beiden Käufe dürfen wegen noch ausstehender Ankunft zunächst nicht vorab gebucht werden.
- #66 etabliert die Gastwirtin und das Angebot: **Position `l1` „bed for the night“, 4 cp, `service: lodging`**; **Position `l2` „bed and stew with bread together“, 6 cp, `service: other`**. Die separate 2-cp-Essensposition scheitert korrekt am Preisbeleg. Der Text für `l2` trägt einen bindenden Gesamtpreis.
- #67: Spieler sagt ausdrücklich **„I accept — six copper for the bed and the stew with bread“**; Planner akzeptiert `offer.t66.6`, **nur `l2`**. Engine bucht `transaction.completed cp=6`, `coin.changed -6`, aber **`service.granted {service:"other", what:"bed and stew with bread together"}`**. Die Bettzeile `l1` wurde damit nicht unabhängig gekauft; kein zweiter Bettpreis abgebucht.
- #69: Spieler legt sich im weiteren Verlauf schlafen. Es liegt kein `service.granted lodging` vor, aus dem der `PAID HERE`-Kontext zuverlässig folgen könnte.

**Befund:** Der Geldabzug ist ausdrücklich autorisiert, Preis und Leistung sind erzählerisch plausibel. Der Verlust der typisierten **Unterkunftsberechtigung** entsteht durch die Klassifizierung der kombinierten Extractor-Angebotsposition als `other`. Ein ähnlicher Leistungs-/Kontextmangel bestand im anderen Mage-Unterkunftsfall auf .186, dort jedoch nach einer **freien `#pay`-Karte**. Diese Fälle sind nicht identisch; **keine automatische Doppelerkennung oder zusätzliche Zahlung** aus dem Bundling ableiten. **P2 zur gezielten Service-/Bündelbehandlung**, nicht P1-Geldautorität.

## 4. R2: Zwei Rogue-Extractorfehler – *kein* `length`, sondern konkret ungültiges JSON-Schema/Ortsref

**Rogue #80, Spielerinput I40**:
- Spieler spricht mit Vessa über das Auslegen von Köder und Vorbereitungen; der Planner erzeugt korrekt `commands:[]` (keine Ankunft).
- Original `chat-completions.jsonl` Requests **n121/n122**: beide Extractorantworten mit **`finish_reason:stop`**. Zuerst `person.new.ref=npc.ostrek` mit `at="realm.duskreach.the_tannery_rows_behind_the_ashbridge_tanneries"`, also **weder katalogisierte Place-ID noch gültiges `{new:{…}}`**.
- Die Reparaturanweisung nennt ausdrücklich einen zulässigen neuen Elternort. Der zweite Versuch **wiederholt dieselbe unzulässige Referenz wörtlich**. `extract.failed` mit `.at: matches none of anyOf`; sämtliche Welt-Deltas dieses Berichts gehen verloren, darunter der eigentlich sinnvolle Plan-/Threadkontext.
- Das ist ein echter, terminaler **Einzelzug-Extractor-Fehler** (kein ganzer Batchabbruch). Das vollständige Engineeventlog bleibt konsistent.

**Rogue #98, Spielerinput I49**:
- Spieler autorisiert ausdrücklich die Reise vom Outflow-Bank zur Ashbridge-Gildenhalle mit `go`; `cmd.resolved` meldet `authorized`.
- Original Requests **n150/n151**: zweimal `finish_reason:stop`; beide Extractorantworten führen **`expected["2"]=null`** zusätzlich zur erwarteten `expected["1"]`, obwohl der Planner für diesen Spielerzug **nur einen** `go` gebucht hat. Der Reparaturprompt verlangt ausdrücklich, die `expected`-Struktur korrekt zu halten; die zweite Antwort wiederholt den unerwarteten Schlüssel.
- `extract.failed` mit `$.expected: unexpected property "2"`; dadurch wird die **wirklich autorisierte Ankunft** nicht gefaltet. Der nächste Zug spielt bereits in der Halle, die Engine steht aber weiter an `loc.outflow_bank`. Spätere `arrive`-Behauptung wird korrekt mit `no_go` abgewiesen.
- Das zeigt eine **Kausalitätskette:** ungültige Extractorform → fehlende autorisierte Ankunft → anhaltende Erzählungs-/Zustandsdrift. Ein normaler `no_go`-Guard kann diese fehlende Weltaktualisierung nicht nachträglich legitimieren.

**Einordnung:** Unter .185 wurde eine einzelne schema-gebundene Reparatur samt Gerüst eingeführt; bei diesen zwei Fällen reicht sie nicht. Trotzdem **kein Anlass, das Schema global zu lockern oder Fantasiezusätze als `expected` zu akzeptieren**. Für Opus: prüfen, warum die konkrete zweite Modellantwort den klaren Reparaturhinweis **unverändert ignoriert** und ob es eng begrenzte Korrektur-/Diagnosemöglichkeiten ohne eine dritte, unbeschränkte Modellrunde gibt. Doppelte `arrive`-Buchung und unzulässige Elternorte als Gegenfälle schützen.

## 5. R3: Erzählerische Ortsdrift trotz benannter Stay-Korrektur

**Warrior #109–#112 (Input I55/I56)**:
- #109: „I'm ready to walk with her to Werrin the reeve **whenever she is**.“ Planner interpretiert die aktuelle Handlung als `use` (Brot essen) und verwirft diese wegen `not_held`; **kein gebuchtes `go`**. Das ist nach der bedingten zukünftigen Reiseabsicht vertretbar.
- #110: Narrator erzählt dennoch den Gang zu Werrins Halle, die Engine verweigert `arrive` mit `no_go` und mehrere abhängige NPC-/Wissensmeldungen mit `scene_context`. Die Korrektur nennt ausdrücklich **Dagny's blue-door house** als tatsächlichen Ort und **reeve's hall, the green door** als nicht erreicht.
- #111: Spieler spricht **Werrin** an, weil die letzte Erzählung ihn dort zeigte; Planner liefert `commands:[]` (Rede, keine Reise).
- #112: Narrator führt dieselbe Reise und Begegnung **erneut** aus; die Engine lehnt erneut `arrive`, `enter`, NPC-Fakten und weitere ortsabhängige Aussagen ab. **Benannte Ortskorrektur wurde im natürlichen Folgezug nicht eingehalten.**

**Rogue #75–#78 (Input I38/I39)**:
- #75: „**Shall we go ask him … now, then?**“ – eine **Frage**, kein gebuchtes Reise-GO (`commands:[]`).
- #76: Narrator setzt die Frage als bereits vollzogenen Gang zu den Tannery Rows um, führt Ostrek und seine Angebote ein. Engine verweigert die Ankunft `no_go` und die abhängigen Informationen `scene_context`.
- #77: Spieler spricht bereits aus der erzählten neuen Szene und fragt nach dem Lockplan; auch hier kein GO.
- #78: Narrator wiederholt den Gang zu den Tannery Rows; dieselben Guards greifen. **Kein integritätswidrig gespeicherter Ortswechsel**, aber ein tatsächlich verwirrender, mehrzügiger Spielverlauf.

**Einzelzählung im gesamten Batch:** `no_go`-Rejections Warrior 3, Rogue 5, Mage 3 = **11**. Das ist **kein** Beweis für 11 unabhängige Bugs; darunter sind legitime refusals, mehrfache Echos derselben unerreichten Szene, sowie #100 beim Rogue als Folge der fehlgeschlagenen #98-Extraktion. `scene_context`-Ablehnungen Warrior 15, Rogue 18, Mage 28 (summa 61) sind ebenfalls **Schutzwirkung**, nicht automatisch 61 separate Defekte.

**Bewertung:** Die Engine-Firewall und benannte Korrektur arbeiten deterministisch wie vorgesehen. Der Narrator folgt dem zuvor erfundenen Ortskontext aber teils stärker als dem Systemzustand; die Modellantwort kann sogar eine bereits widerlegte Szene erneut erzählen. Der `.187`-Korrekturtext allein hat den **natürlichen** Drift somit nicht beseitigt. Nicht aus einer *Frage* automatisch ein autorisiertes GO machen und keine pauschale Welt-Freistellung. Präziser nächster Schritt: am **originalen nächsten Narrator-Request** verifizieren, wo die benannte Korrektur tatsächlich im endgültigen Prompt steht, ob die nichtautorisierten Vorworte weiterhin mitschwingen und ob ein kleiner kausal sicherer Rückführungsweg existiert. Ein weiterer reiner „stay here“-Satz ist nach diesen Befunden unzureichend belegt.

## 6. NPC E2/E3: deutlich mehr echte Belege

| Kennzahl laut `npc-pulse.json` | Warrior | Rogue | Mage | Gesamt |
|---|---:|---:|---:|---:|
| Neue Personen | 15 | 25 | 17 | **57** |
| Wiederbegegnungen | 9 | 4 | 3 | **16** |
| Persönliche Threads | 8 | 5 | 4 | **17** |
| Fortgeführte/erledigte persönliche Threads | 4 | 3 | 3 | **10** |
| Gespeicherte E3-Anker | 8 | 3 | 4 | **15** |
| E3-Anker später geändert | 3 | 0 | 1 | **4** |
| Anker vollständig später auf Karte | 5 | 3 | 1 | **9** |
| Weitere Anker nur gekürzt | 2 | 0 | 1 | **3** |
| Offene persönliche Threads vollständig auf Karte | 7 | 3 | 0 | **10** |

Zum Vergleich natürlicher .186-Batch: 32 neue Personen, 10 Wiederbegegnungen, 5 persönliche Threads, **3** E3-Anker in ebenfalls 210 Inputs. Die diesmal erreichten **15** Anker sind eine substanzielle neue Beobachtungsgrundlage, aber die Profile haben andere Personen/Begegnungsdichte/Szenen. **Keine Anhebung der E3-Quote als Buildwirkung behaupten**.

**Qualitative Stichproben:**
- Warrior **Marla** `manner` (trocken-necken, unaufgeregt): ganz auf der Folgekarte bei #44 sichtbar und die Gesprächsfortsetzung passt dazu.
- Warrior **Brannic Vell** `voice` und `manner`: im Text zusammenhängende ruhige Art, teils als handlungsbezogene Eigenschaft etikettiert; `voice` ganz, späteres `manner` nur gekürzt; seine späte Erinnerung wird nicht dadurch automatisch falsch.
- Rogue **Vessa** `manner` auf #88 gespeichert, zunächst nur teilweise, später voll verfügbar; persönliche Jagd-/Berichtsabsprachen werden fortgeführt.
- Mage **Berra Wren**: `voice` („wary of the Queen, keeps glancing…“) enthält faktisch Haltung/Verhalten statt Sprechweise, wird dennoch als Anker gespeichert; ihr `interest` wird später mehrfach ersetzt, ohne auf der Folgekarte voll zu erscheinen. Das ist eine **qualitative Etikettierungsgrenze**, keine nachgewiesene defekte Persistenz.
- `handled_by=0` in den Runner-Desk-Beobachtungen bleibt als **Messgrenze** zu betrachten: bereits im Spielerzug belegtes Wissen und nur durch Extractor-`desk_handler` nachgemeldete Belege auseinanderhalten. Keine Lockerung der Zeugenregeln aus der Nullquote. Runner-`anchor_use`-Einträge sind **Kandidaten zur Sichtprüfung**, nicht allein Beweis einer gelungenen späteren Charakterdarstellung.

**Kein allgemeiner E3-Fix** aus den Summen. Für Opus sind stattdessen drei Qualitätsfragen wichtig: Inhalt richtiges Feld `voice/manner/interest`, tatsächlich volle spätere Lieferungen sowie Verwendung in der nächsten Narration.

## 7. PULSE, Dungeon und Monster – Grenzen

**PULSE:** `pulse.rolled` 60/49/35 = **144** Würfe, 11/9/4 = **24** offene Fenster. Im .186-Batch waren es 93/21. Es gibt reale Reise-, Szenen-, Rast- und Mage-Dungeonwürfe (2); der Rest folgt unterschiedlichen Expositionsprofilen, **keiner** kontrollierten Frequenzänderung. `open_window_not_narrated`-Hinweise (Warrior 4, Rogue 2, Mage 2) sind heuristische Auswertungen; `new_world_content_in_closed_window` kann auch vom Spieler bewusst aufgesuchte Personen/Orte betreffen. Nicht pauschal als PULSE-Integritätsfehler verbuchen.

**Dungeon (Mage):** Glimmerdeep-Grotto ist tatsächlich betreten; die Engine erzeugt Beuteszenen und verkauft acht Chitinplatten später ordnungsgemäß. Bei #106/anderen Meldungen versucht der Extractor unter anderem eine frei erzählte **„Glimmer Queen“** als Dungeon-Gegner zu materialisieren; die Engine verweigert `dungeon_foe` und die abgeleiteten `creature_continuity`-Behauptungen korrekt. Keine automatische Freigabe eines gebuchten Bosses aus bloßer Erzählung. Die narrative Figur kann im Gespräch trotzdem Thema bleiben, das ist eine eigene Modell-/Lore-Frage.

**Monster A2:** Die .188-Kampagnen liefern keinen gleichwertigen positiven Gegenfall zur Waffen-/Loot-Prüfung aus dem Warrior-.186-Lauf; fehlende A2-Beobachtung ist keine Regression. A2-Balance, PULSE-Design und E3-Regeln nicht als Nebenpaket verändern.

## 8. P1f-Budget: starke Stichprobe, **keine kausale Wirksamkeitsmessung**

Die **vollständigen 638 `calls.json`-Records** wurden unabhängig eingelesen und nach `finish`, `role`, `repair`, `max_tokens`, `content_chars` ausgewertet:
- **0 `finish=length`, 0 vollständig leere Antworten**, bei unverändertem Modell `zai-org/GLM-5.3-Flash` und dokumentiertem `reasoning_effort:low`.
- 16/15/11 = **42** Extractor-Reparaturaufrufe. Zwei Rogue-Extraktionen scheitern trotzdem endgültig (`stop`, aber ungültiges Schema).
- Planner 0 zusätzliche Reparaturaufrufe beim Warrior und Rogue; Mage 2. Im alten .186-Batch gab es **69** Modellaufrufe mit `finish=length`, davon überwiegend leere Ausgaben.

**Wichtige Kausalgrenze:** Die .187-P1f-Änderung verbessert **nur die Aufforderung nach einer bereits leeren, mit `finish=length` abgebrochenen Planner-Erstantwort**. Da diese Bedingung in .188 **keinmal eingetreten ist**, kann der Patch selbst den Rückgang der *Erstantwort-Abbrüche* im vorliegenden Batch nicht erklärt haben. Das Ergebnis kann u. a. mit natürlichen Modell-/Provider-Variationen, anderen Storys oder günstigeren LLM-Verläufen zusammenhängen. Keine Behauptung über garantierte Einsparungen oder geheilte Reasoning-Regel.

**Trotz null Längenabbrüchen** bleiben die zwei Rogue-`extract.failed` als klar eigene Fehlklasse. P1f nicht reflexhaft durch höhere Tokenlimits nachbessern.

## 9. Priorität für den unabhängigen Opus-Gegenreview

| Priorität | Zu prüfender Befund | Entscheidungsfrage |
|---|---|---|
| **P1 bei Nachweis einer Integritätsverletzung, derzeit P2** | Rogue #98 autorisierte Gildenhallen-Ankunft durch `expected.2`-Schablonenfehler nie gebucht | Ist eine enge Reparaturformkorrektur möglich, ohne Schema/Ankunftsguard zu lockern oder eine ungebuchte Reise zu erfinden? |
| **P2 – erheblich für Spielbarkeit** | Warrior #109–112, Rogue #75–78: wiederholte erdachte Reise trotz benannter Ortskorrektur | War die Stay-Korrektur wirklich im **nächsten Narrator-Request**, und wie kann der aktuelle Enginezustand die erzählte unerreichte Szene ohne Retcon-Chaos überstimmen? |
| **P2 – Dienstleistungssemantik** | Mage #66–69: gebuchtes 6-cp-Bett-und-Essen-Paket als `service:other` | Gewählte Bündelposition trägt keine `lodging`-Leistung; enges Schutz-/Mappingkonzept erforderlich oder bewusst zulässiges freies Paket? |
| **P2 – Extractorform** | Rogue #80 wiederholt unzulässige Orts-ID im zweiten Versuch | Liegt es am Reparaturprompt, ID-Katalog, JSON-Diff oder einer unerwünschten harten Zeilenzuordnung? |
| **Beobachten** | E3-Anker-Qualität, PULSE-Fenster, Dungeon-Queen-Narration | Nur konkrete positive/negative Modellevidenz, keine neue allgemeine Regel |
| **Kein Sofortpatch** | P1f-Ausgabebudget, `work_not_purchase`, Monster A2 | Ohne echten Fehlfall keine erneute Generaländerung |

**Schluss:** **Drei reguläre Enden und null Längenabbrüche** sind ein guter natürlicher Fortschritt. Aber die Kombination aus zwei verlorenen Rogue-Worldberichten, mehrfach ignorierten Standortkorrekturen und nicht typisiertem Mage-Unterkunftsbündel verhindert ein uneingeschränktes Integritäts-GO. **Erst unabhängiger Opus-Gegenreview auf den konkreten Originalfällen**, dann gezielte Entscheidung; kein sofortiger weiterer Dreierbatch.

**Keine Produktänderung durch diesen Review. Keine geskripteten Tests oder ST-Smokes neu ausgeführt.**
