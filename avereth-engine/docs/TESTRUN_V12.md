# Live-Lauf 27.09.2026, 07:10 (Build 3.1.7): Architektur-Stresstest

Dieser Lauf wird als Architektur-Stresstest ausgewertet, nicht als Fehlerliste. Die Schlussfolgerungen stehen in [RUNTIME_V4_PLAN.md](RUNTIME_V4_PLAN.md).

**Grundlage:**
- Chat-Datei `Avereth_Engine_Test_-_2026-09-27@07h10m52s877ms.jsonl`: Metadaten und 21 Nachrichten, ohne Swipes.
- Event-Export mit 19 Nachrichten, die Events tragen; jeder Record hat `build: 3.1.7`.
- Chat-Completion-Log mit 11 Anfragen: 8 Erzählerzüge und 3 Report-Nachforderungen.
- Tiefenanalyse von ChatGPT, im Auftrag als Befunde 1–10 zusammengefasst.

**Aufbau:**
- GLM-5.3-Flash über einen Custom-Endpoint, Reasoning `low`.
- Preset Avereth Narrator, Lore aus World Info (Lorebook v0.12), Wortersatz `ledger=register`.
- Gespielt wurde ein Duelist mit Precision Thrust und Evasive Step, Start vor Redmarch (Veyrhold).

**Stationen:**
- in die Stadt und in die Gildenhalle;
- Registrierung für 2 Silber;
- Novice-Brett mit fünf Aufträgen;
- Miller's Run Escort genommen, danach Herb Run;
- zu den Reedbeds, einen Tag Marshmint gesammelt;
- zurück zur Gilde zur Abgabe;
- Suche nach einem Gasthaus.

## 1. Reproduktion auf 3.1.7

**Methode** (wie seit Testrun 10):
- Das Fixture wird aus der Chat-Datei und dem geparsten Anfrage-Log gebaut. Es enthält die Spielernachrichten, die Erzähler-Antworten mit ihren Reports und die Antworten der drei Nachforderungen. Die Zuordnung ist explizit: Antwort 8, 14 und 16 bekamen je eine Nachforderung.
- Der Replay läuft über `host.js`: `processReply`, `reportRequest` und `applyReportAnswer`. Einstellungen: `engineLore: false`, `ledger=register`.

**Ergebnis: byte-gleich.** Übereinstimmend sind:
- die Events aller 19 Nachrichten, die System-Panels und die HUDs;
- alle 8 Engine-Blöcke;
- die 3 Prompts der Nachforderungen.

Alle Befunde unten sind damit Befunde des unveränderten Standes 3.1.7.

**Zum Repository:** Fixture und Replay liegen noch im Arbeitsverzeichnis der Analyse. Sie kommen mit Phase P0 des V4-Plans als `tests/testrun_v12/` ins Repository, als Eingabe des Golden-V4-Tests.

## 2. Ablauf je Zug

Nummern = Index der Chat-Nachricht (Spieler/Antwort).

| # | Spieler | Report | Was die Engine daraus machte |
|---|---|---|---|
| 5/6 | „walk into the city … enter the guild building“ | in der Antwort | `place` „Redmarch — Guildhall entrance hall“; neuer NPC `npc.guild_clerk` mit Name „Guild Clerk“, `known_name` „Guild“ |
| 7/8 | „Im here to Register“ | **fehlt** → Nachforderung (12,5 s) | vier Fakten zur Gildenregistrierung (Gebühr 2 Silber …); Fakt `pc intent = register with the Guild` |
| 9/10 | „pay the 2 Silver … Stone … look at the Novice Quest Board“ | in der Antwort, **ohne `quests`** | −20 cp, `guild_rank Novice`, Plakette als Item. Der Aushang mit fünf Aufträgen steht nur in der Prosa; ein anderer Abenteurer nimmt dort den Weasel-Auftrag |
| 11/12 | „take the Millers Run Escort Quest … register it“ | in der Antwort | Quest abgelehnt (`rank "Novice 1-14"`). Ossler („not yet met“) wird anwesend und „first saw {pc}“. Der Fakt `pc takes Miller's Run Escort quest` wird angenommen |
| 13/14 | „register the Herb Run Quest too and travel to the reedbeds …“ | **fehlt** → Nachforderung (14,4 s) | neue Top-Level-Location `loc.redmarch_reedbeds_east_of_the_mill_leat`; Herb Run abgelehnt (PLAYER OWNERSHIP); Wissen des Clerks abgelehnt (nicht anwesend) |
| 15/16 | „since i have the whole day i start carrying armfulls down the path“ | **fehlt** → Nachforderung (12,1 s) | `time: 300` abgelehnt; der gesammelte Marshmint-Haufen existiert nur als Fakt |
| 17/18 | „carrying it all back to the guild to turn it in and the Quest with it“ | in der Antwort | `location: Redmarch` abgelehnt (keine Reiseabsicht erkannt); Übergabe des Marshmint abgelehnt („has 0“); Abschluss von Herb Run abgelehnt („never offered or accepted“) |
| 19/20 | „turn the Quest in … looking for an Inn to sleep and wash …“ | in der Antwort | Marsh Bell als `place` der Reedbeds-Location; neuer Innkeeper. **−7 cp über `taken_by: innkeeper` angenommen.** „hot bath, room, laundry“ als Item abgelehnt; Quest-Abschluss abgelehnt |

## 3. Zustand nach dem Lauf

Grundlage ist der Fold aller 19 Nachrichten.

| Bereich | Engine-Zustand | Erzählung |
|---|---|---|
| Quests | `quests = {}`: keine einzige | zwei Gildenaufträge angenommen, einer abgegeben |
| Uhr | Tag 1, 13:45 | ein ganzer Sammeltag, Rückweg, Abend im Gasthaus. Es fehlen rund 5 Stunden (`time: 300` abgelehnt) |
| Ort | `scene.location = loc.redmarch_reedbeds_east_of_the_mill_leat`, `place = "Marsh Bell inn (lane behind the cooper's yard)"` | Gasthaus in Redmarch. Die Engine verortet das Gasthaus und den Innkeeper **in den Reedbeds** |
| Ossler | kennt Alarics Aussehen (`witnessed`) und hat die Erinnerung „first saw {pc} at Redmarch — Guildhall entrance hall“ | „carter for Harrow's mill, not yet met“ |
| Clerk | Name „Guild Clerk“, bekannter Name „Guild“ | eine Angestellte ohne genannten Namen |
| Alaric-Fakten | `takes = Miller's Run Escort quest` (die Quest existiert nicht), `intent = register with the Guild`, `lacks = a basket …`, `status = mud to the knees, aching back and forearms …` | – |
| Coin, Inventar | 23 cp (50 − 20 Registrierung − 7 Gasthaus); Small Pouch, Guild registration plate | Marshmint abgeliefert, Belohnung erhalten, Zimmer bezahlt |

Zu `status`: Der Report schrieb `condition`. Das Prädikat-Synonym `condition → status` legt den Satz in den funktionalen Status-Slot, den sonst Leben und Tod belegen. `statusOf(pc)` liefert seitdem diesen Satz.

## 4. Befunde 1–10 aus dem Auftrag: alle bestätigt

Die Ursachenklassen RC1–RC10 sind in [RUNTIME_V4_PLAN.md §1](RUNTIME_V4_PLAN.md#1-root-causes) beschrieben.

### 1. Aushang nur in der Prosa: bestätigt

**Beleg:**
- Antwort 10 zeigt fünf Aufträge mit Titel, Rang und Belohnung:
  - Miller's Run Escort, 8 Silber;
  - Weasel Sign at Fenwick's Coop, 15 Silber;
  - Herb Run — Marshmint, 4 Silber;
  - Missing Dog, 2 Silber;
  - Fence Repair, 5 Silber.
- Ihr gültiger Report enthält `coin`, `learn`, `facts`, `items` und `new`, aber kein `quests`.

**Code:**
- `reportToEvents` prüft nur die Schlüssel, die vorhanden sind.
- Eine Nachforderung gibt es nur bei *fehlendem* oder kaputtem Report (`report_error`), bei unidentifizierten Angreifern und bei der Stadt ohne Ort (`host.js`, `processReply`).
- Ob der Report vollständig zur Prosa passt, prüft niemand.

**Ursache:** RC4, RC5, RC7.

### 2. „Novice 1-14“: bestätigt, Drift im eigenen Prompt

**Beleg:** Antwort 12 und 18 melden `"rank": "Novice 1-14"`, beide werden abgelehnt.

**Code:** Die drei Quellen des Formats widersprechen sich:
- `content/narrator.json`, `report.keys.quests`: „rank = Guild Quest Rank: Novice 1-14, Proven 15-29, …“;
- `delta.js`: akzeptiert nur einen Namen aus `QUEST_RANKS` oder eine reine Zahl (`/^\d+$/`), sonst „is not a Guild Quest Rank“;
- `schemas/report.schema.json`: `rank` als Enum der Namen. Das Schema wird zur Laufzeit nie angewandt; Tests prüfen nur die Content-Schemas.

**Ursache:** RC5.

### 3. Ossler: Existenz gleich Anwesenheit: bestätigt

**Beleg:** Antwort 12 meldet `new: [{ref: ossler, name: Ossler, traits: "carter for Harrow's mill, not yet met", band: LONG}]`.

**Code:**
- `delta.js` legt für jedes `new` sowohl `entity.created` als auch `scene.entered` an.
- Danach erzeugt der Wahrnehmungsschritt in `narratorReply` (`engine.js`) für jeden Anwesenden, der Alaric bemerkt, `knowledge.gained f.pc.appearance (witnessed)` und die Erinnerung „first saw“.
- Das Report-Schema kennt kein „erwähnt, aber nicht hier“.

**Ursache:** RC3.

### 4. „register the Herb Run Quest“: bestätigt

**Beleg:**
- Die Nachforderung zu Antwort 14 meldet Herb Run als `active`.
- Die Engine lehnt ab: „PLAYER OWNERSHIP: accepting the quest "Herb Run" needs the player's own decision in the current message“.

**Code:**
- `authorization().accept` und `takesQuest` erkennen „register“ nicht (TAKE_RE).
- Nebenbefund: Der Wortersatz `ledger=register` macht „register“ in der Erzählung häufiger. Der Spieler übernimmt so das Vokabular, das die Regex nicht kennt.

**Ursache:** RC1.

### 5. Report als End-Snapshot: bestätigt

**Beleg:** Die Nachforderung zu Antwort 14 meldet `learn {who: "Guild Clerk", s: Alaric, p: takes, o: "Herb Run quest", how: witnessed}`. Abgelehnt: „npc.guild_clerk is not present and cannot have witnessed it“.

**Code:**
- Die Reise (`location`) wird zuerst verarbeitet und leert die Szene (`reset_present`).
- `learn` mit `witnessed` prüft danach die Anwesenheit am **Ende** der Antwort (Abschnitt `learn` in `delta.js`).
- Der Report hat keine Reihenfolge; er beschreibt nur den Endstand.

**Ursache:** RC2.

### 6. Reedbeds als Top-Level-Location: bestätigt

**Beleg:**
- Die Nachforderung zu Antwort 14 meldet `location: "Redmarch — reedbeds east of the mill leat"`.
- Daraus entsteht `entity.created loc.redmarch_reedbeds_east_of_the_mill_leat` (kind `location`, nur `realm`) und `scene.moved` mit `reset_present`.
- In Antwort 20 wird der Marsh Bell ein `place` dieser Location, und der Innkeeper bekommt `location` = Reedbeds.

**Code:** Orte haben kein `parent`. `lore.json`-Orte haben nur `id`, `name`, `kind` und `realm`; Laufzeit-Orte sind Entities mit Name und Realm.

**Ursache:** RC8.

### 7. Ganztägiges Sammeln: bestätigt

**Beleg:** Die Nachforderung zu Antwort 16 meldet `time: 300`. Abgelehnt: „skipping more than two hours (rest, travel, waiting) needs the player's own decision“.

**Code:**
- `delta.js`: `t > 120 && !auth.rest && !state.encounter` → Ablehnung.
- `auth.rest` kennt nur Ruhe- und Warte-Verben.
- „since i have the whole day i start carrying armfulls“ ist eine klar autorisierte Tätigkeit, gehört aber zu keiner Kategorie.
- Folge: Die Uhr liegt rund 5 Stunden hinter der Erzählung (§3).

**Ursache:** RC1, RC9.

### 8. Marshmint nur als Fakt: bestätigt

**Beleg:**
- Antwort 16 meldet `fact {s: "Alaric's gathered pile", p: size, o: "roughly a meal sack of marshmint, hard to judge without a basket"}`.
- Antwort 18 meldet `items [{item: "marshmint (full basket's worth)", from: Alaric, to: "Redmarch Guild"}]`. Abgelehnt: „Alaric does not carry 1 × marshmint (full basket's worth) (has 0)“.

**Code:**
- `items` ist im Prompt als „physical hand-overs“ definiert.
- Es gibt kein Primitiv für Sammeln oder Ernten.
- Objekte haben keinen Besitzer außer einem Charakterbogen, also auch keinen Ort als Besitzer.

**Ursache:** RC4.

### 9. „carrying it all back to the guild“: bestätigt

**Beleg:** Antwort 18 meldet `location: "Redmarch"`. Abgelehnt: „travelling to another location needs the player's own decision“.

**Code:**
- TRAVEL_RE kennt „carry … back to“ nicht.
- Mit einer Orts-Hierarchie wäre Redmarch zudem der Elternort der Reedbeds: Der Rückweg wäre ein Weg innerhalb der Stadtumgebung und keine Reise in eine andere Location.

**Ursache:** RC1, RC8.

### 10. Gasthaus: `taken_by` als Kaufzwang: bestätigt

**Beleg:**
- Antwort 20 meldet `coin [{cp: -7, taken_by: "innkeeper", why: "room (4), bath (2), laundry (1)"}]`. Das wird angenommen, obwohl die Spielernachricht keine Zahlung enthält.
- Der Innkeeper wurde im selben Report per `new` eingeführt und gilt dadurch als „anwesend“: Die Menge `introduced` in `delta.js` macht ihn zum gültigen `taken_by`.
- `items` mit „hot bath, room, laundry“ zeigt zusätzlich: Dienstleistungen haben kein Modell.

**Code:** Die Report-Instruktion selbst lehrt den Bypass:
- `narrator.json`, `report.instruction`: „Alaric moves, pays, gives or accepts only if the player's message chose it (**else name the NPC in taken_by/forced_by**)“.
- Jede freiwillige Handlung Alarics, die der Spieler nicht gewählt hat, soll der Erzähler also einem NPC als Zwang zuschreiben.

**Ursache:** RC6, RC4.

## 5. Weitere Befunde

| # | Befund | Beleg |
|---|---|---|
| A1 | Eine Rolle wird zum Eigennamen: „Guild Clerk“ wird `name`, und „Guild“ gilt als bekannter Namensteil | Antwort 6, `entity.created` |
| A2 | Fakten umgehen die Domänen: `pc takes Miller's Run Escort quest` wird angenommen, obwohl die Quest abgelehnt wurde. Triviale Absichten (`pc intent = register`) und Zustände als Satz (`pc lacks = a basket`) werden Weltwahrheit | Antwort 8, 12, 14 |
| A3 | Das Synonym `condition → status` schreibt einen beschreibenden Zustand in den funktionalen Status-Slot von Alaric (§3) | Antwort 16 |
| A4 | Die Uhr liegt ~5 h hinter der Erzählung (Folge von Befund 7). Das wirkt auf Fristen, Tageswechsel und den Aushang (UID 66: Wechsel einmal pro Tag) | Endzustand |
| A5 | Der Aushang lebt: Ein anderer Abenteurer nimmt den Weasel-Auftrag. UID 66 beschreibt genau das („Other adventurers take work“), die Engine sieht es nicht | Antwort 10 |
| A6 | 3 von 8 Erzähler-Antworten ohne Report (37,5 %); je Nachforderung 12,1–14,4 s. Die drei Nachforderungen lieferten inhaltlich brauchbare Reports | Anfrage-Log |
| A7 | Empfangen ohne Zustimmung: Items und Coin **an** Alaric brauchen keine Spielerentscheidung (`delta.js` prüft nur `from === 'pc'`). Beute oder Fundstücke landen ohne „nimmt“ im Inventar (Core #20: „must actually take“; UID 44: „Do not auto-pick up“). Im Lauf nicht aufgetreten, im Code belegt | `delta.js`, Abschnitt `items` |
| A8 | `event.schema.json` kennt `report.requested` nicht, der Reducer schon. `report.schema.json` und `event.schema.json` werden zur Laufzeit nicht angewandt; `d` ist ein freies Objekt | Schema gegen `state.js` |
| A9 | Beweisanforderungen stehen nur als Freitext in der Prosa: „Waystation master signs your plate at delivery“, „full basket of marshmint required, weighed on return“. Es gibt kein Feld dafür, und die Abgabe kann nichts prüfen | Antwort 12, Nachforderung 14 |

## 6. Latenz und Token (Anfrage-Log und Chat-Zeitstempel)

| Aufruf | Anzahl | Prompt-Token | Output-Token | Dauer |
|---|---|---|---|---|
| Erzählerzug | 8 | 6.797–8.505 (Ø 7.636) | 375–970 (Ø 573) | 22,7–59,9 s (Ø 35,4 s, Median 34,2 s) |
| Report-Nachforderung | 3 | 1.644–2.164 | 223–270 | 12,1–14,4 s |

- **Output-Tempo:** Nachforderungen ≈ 18–19 Token/s (Output geteilt durch Gesamtdauer); Erzählerzüge 11–18 Token/s (mit Prefill der ~7,6k Prompt-Token).
- **Kein Prompt-Caching:** `cached_tokens: 0` in allen 11 Antworten.
- **Kein strukturierter Output:** `response_format` fehlt in allen Anfragen.
  - SillyTavern 1.19 reicht `jsonSchema` von `generateRaw` bei der Quelle Custom als `response_format: {type: json_schema}` weiter (Quellcode `src/endpoints/backends/chat-completions.js`).
  - Ob GLM-5.3-Flash über diesen Endpoint das Schema einhält, ist **nicht getestet**; in dieser Umgebung gibt es keinen API-Schlüssel.
  - → Spike S0 im Plan.

## 7. Einordnung

**Die zehn Befunde:**
- Keiner ist ein Tippfehler im Code.
- Sie folgen aus wenigen strukturellen Ursachen:
  - drei unabhängige Bedeutungsquellen: Regex, Erzähler und Validator;
  - ein Report als End-Snapshot;
  - Existenz gleich Präsenz;
  - fehlende Domänenobjekte für Quest, Aushang, Objekt, Angebot und Ort;
  - Drift zwischen Prompt, Schema und Validator;
  - ein Zwangs-Bypass, den der Prompt selbst lehrt.

**Grenze der Patch-Strategie:**
- 3.1.5 bis 3.1.7 waren drei Iterationen allein an der Abgabe-Formulierung.
- `intent.js` enthält inzwischen 18 Regex-Konstanten.

**Folgerung:** Weitere Synonym-Patches würden die Divergenz der drei Bedeutungsquellen vergrößern, nicht schließen. → [RUNTIME_V4_PLAN.md](RUNTIME_V4_PLAN.md)
