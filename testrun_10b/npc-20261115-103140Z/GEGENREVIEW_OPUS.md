# Unabhängiger Opus-Gegenreview – natürlicher NPC-/PULSE-Batch `.191` (15.11.2026)

**Gegenstand:** natürlicher Batch `npc-batch-20261115-103140Z` auf `.191` (`b8d3be5`) und der [GPT-Review](REVIEW_GPT.md) dazu. Vergleich mit den Batches [`.186`](../npc-20261114-094810Z/GEGENREVIEW_OPUS.md) und [`.188`](../npc-20261114-161005Z/GEGENREVIEW_OPUS.md).

> **Nur Analyse.** Keine Produktänderung, kein Modellaufruf, kein ST-Smoke. Alle Gegenproben laufen lokal gegen den unveränderten Produktcode `.191` mit den aufgezeichneten Modellantworten.

**Zählweise:**
- `T`*n* ist die *n*-te Spielereingabe; das entspricht dem `turn` in `calls.json` und der Zählung im GPT-Review. Der interne Engine-Turn ist *n*−1.
- `#`*n* ist der Chatindex ab der Begrüßung (#0). Eingabe T*n* ist #(2*n*−1), ihre Antwort #(2*n*).

## 1. Gesamturteil

**Die gemeinsame Bewegungsautorität wirkt im natürlichen Spiel.**
- Von 26 autorisierten Schritten erreichen 25 ihr Ziel, einer endet an einem PULSE-Halt.
- Kein Schritt wird von der Engine verworfen, keine Extraktion scheitert an einem Schritt.
- Es gibt genau eine unautorisierte Ankunft. Sie wird im nächsten Zug sichtbar zurückgeführt (N1/N2/N4).
- Die erste B5-Dungeonsektion bucht die Engine sauber.

**Die 35 `scene_context`-Ablehnungen sind überwiegend keine Folgen verweigerter Reisen mehr.** In `.186/.188` folgten 87 von 106 auf eine verweigerte Ankunft, hier nur 7 von 35. Die übrigen 28 entstehen bei gebuchter oder ganz ohne Ankunft. Ursachen sind:
- eine falsche Ortshierarchie aus dem Gildenbrett (P1),
- eine zu grobe Szenenangabe des Extractors,
- eine echte Grenzverletzung des Erzählers.

**T70 ist kein reiner Erzählerfehler.** Die eigene Dungeon-Karte der Engine lädt den Erzähler ausdrücklich ein, einen freien Slot der Ebene „even before an earlier encounter is resolved“ zu zeigen. Die Firewall kann genau das nie annehmen. Der danach gespeicherte Thread ist das Symptom dieses Widerspruchs.

**Keiner der Befunde ist ein Rückschritt durch `.190/.191`.** Alle Ursachen sind nach Git-Historie älter. B5 verschärft nur einen alten Kartenwiderspruch, weil Slots jetzt feste Abschnitte haben.

**Urteil:** eingeschränkt auswertbarer natürlicher Pilot mit positiver Ortsevidenz. Zwei gezielte Korrekturen (P1) sind vor dem nächsten persönlichen User-Test sinnvoll. Kein Anlass für einen weiteren Architekturumbau.

## 2. Quellenbasis und Methode

**Gelesen** aus `npc-batch-20261115-103140Z-OPUS-GEGENREVIEW-KOMPAKT.zip`:
- Alle 35 SHA-256-Prüfsummen des `README_SOURCE_MANIFEST.md` stimmen.
- Pro Profil: `chat.jsonl`, `avereth-events.json`, `calls.json`, `evaluation.json`, `npc-pulse.json/.md`, `player.jsonl`, `report.md`, `run.json`.
- `ALL_MODEL_RESPONSES_COMPACT.jsonl`: alle 218 + 73 Engine-Aufrufe mit vollständiger Antwort.
- `FOCUS_ORIGINAL_COMPLETIONS.jsonl`: Originalrequests der Schlüsselturns (Warrior 3, 4, 10–13, 18–21, 45–49, 61–64, 69–70; Rogue 3, 4, 16–22).
- Die vollständige Original-ZIP (SHA-256 `cfae1193…d5ec259`) liegt beim Nutzer. Dieses Paket ist ihr belegter Auszug.

**Lokaler Nachlauf** (`tools/replay/build_corpus.mjs`, `tools/replay/replay.mjs`):
- Beide spielbaren Läufe wurden aus den aufgezeichneten Antworten zu einem Replay-Korpus gebaut (150/150 bzw. 52/53 Antworten zugeordnet, eine als Providerfehler) und mit `.191` erneut verarbeitet.
- **Warrior: 137/137 Records identisch** mit dem Original.
- **Rogue: 41/42 identisch.** Die einzige Abweichung ist der Fehlertext der durch das Credit-Limit gescheiterten Extraktion #44 (`replayed provider error` statt `Payment Required`).
- 0 Fold-Fehler, 0 Validierungsprobleme.
- Der Nachlauf reproduziert die Läufe also exakt. Damit sind Gegenproben am Originalzustand möglich.

**Gegenproben:** Eine Antwort wird auf ihrem Originalzustand mit einer gezielt veränderten Extractor-Antwort erneut angewendet; Details stehen in Anhang A. Dazu kamen `tools/location_report.mjs` über `.186`, `.188` und `.191` sowie Codelesung und Git-Datierung der Ursachen.

**Grenzen:**
- Prompts liegen nur für die Fokusturns vor. Aussagen über andere Narrator-Karten stützen sich auf die Records.
- Die Laufumfänge sind ungleich; Raten pro zehn Antworten sind nur Richtwerte.

## 3. Läufe und Credit-Limit

| Profil | Eingaben | Ende | Einordnung |
|---|---:|---|---|
| Warrior `npc-sociable` · Seed 7 | **70/70** | `done` | vollständig auswertbar |
| Rogue `npc-wary` · Seed 8 | **22/70** | `extractor_failed` T22 | bis einschließlich T21 auswertbar. T22: Erzählung vorhanden, Weltänderungen wegen `HTTP 200: Payment Required` nicht gebucht |
| Mage `npc-inquisitive` · Seed 9 | **0/70** | `harness` | nur Start-/Exportintegrität |

**Rogue T22:** Die Engine verhält sich korrekt fail-soft.
- ST 1.19 meldet den Providerstopp als HTTP 200 mit `Payment Required`.
- `providerResponseError` stuft das als nicht wiederholbar ein, also gibt es keinen Neuversuch.
- Die Extraktion wird als gescheitert vermerkt, der Zustand bleibt konsistent (0 Fold-Fehler).
- Der Erzähleraufruf dieses Zuges dauerte 122,6 s; der Provider war schon vor dem Stopp langsam.

**Mage:**
- Schon die Vorabprobe des Runners erhielt `HTTP 402: Insufficient credits` (Guthaben −0,0003 USD).
- Danach scheiterten drei Spielerversuche ebenso.
- Der Chat enthält nur die Begrüßung, die Integrität ist OK, Secret-Hits 0.

**Keine** der drei Abbruchursachen ist ein Fehler der Engine, des RPG-Designs oder des Runners. Fehlende Eingaben werden nicht als Misserfolg gezählt. `batch.status=completed` ist keine Spielabnahme.

**Runner-Hinweis (P3):** Beide Stopps erscheinen als `extractor_failed` bzw. `harness`/`process_error`. Eine eigene Endart „Provider-Guthaben“ und ein Abbruch schon bei 402 in der Vorabprobe würden das künftig eindeutig machen.

## 4. Ortsarchitektur im Vergleich

Werkzeug: `tools/location_report.mjs` über die gespeicherten Records. Ergänzt um eine eigene Einordnung jeder `scene_context`-Ablehnung: Szene der Meldung gegen den Ort der Engine an diesem Schritt.

| Kennzahl | `.186` (3 Läufe, 173 Antw.) | `.188` (3 Läufe, 195 Antw.) | `.191` (2 Läufe, 87 Antw.) |
|---|---:|---:|---:|
| Autorisierte Schritte · angekommen | 61 · 49 | 83 · 73 | **26 · 25** (1 PULSE-Halt) |
| … von der Engine verworfen / Extraktion gescheitert | 6 / 1 | 4 / 1 | **0 / 0** |
| Unautorisierte Ankünfte (`no_go`) | 5 | 11 | **1** (W T47) |
| Folgen von Antworten mit verweigerter Ankunft (Länge) | 6 (11 Antw., max. 3) | 10 (15 Antw., max. 3) | **1 (1 Antw.)** |
| Verwaiste Orte · doppelte Orte/NPCs | 5 · 0 | 0 · 2/1 | **0 · 0** |
| `scene_context` insgesamt | 45 | 61 | 35 |
| … davon nach verweigerter Ankunft | 40 | 53 | **7** |
| … davon ohne verweigerte Ankunft | 5 | 8 | **28** |

**Lesart:**
- Verweigerte Reisen und ihre Ketten sind deutlich seltener geworden. Pro zehn Antworten sinken die Folgeablehnungen nach verweigerter Ankunft von 2,3 bzw. 2,7 auf 0,8.
- Die verbliebenen Szenenablehnungen haben einen anderen Charakter. Sie hängen nicht an der Reiseautorität, sondern an der Szenenangabe einzelner Meldungen.
- `location_report` zählt die zwei `road`-Ablehnungen von W T29 als „primär“. Das sind PULSE-Gruppenregeln für Wildschweine, keine Ortsablehnungen. Echte Ankunftsverweigerungen gibt es in `.191` genau eine.

Natürlich bestätigt sind außerdem:
- **D3/7e:** T60 „take the horn key up to my room and sleep“ wird zu GO `{new:"my room"}` plus Schlaf und erreicht das Horn-Zimmer.
- **Unterkunft und Händlersuche:** T54/T56 als GO zu neuen Orten.

**Nicht berührt** wurden G1 (Ebenenende), G2/G3b (Gebäudeblocker), G4 (widerlegter Bericht) und R5 (Halt in einer dritten Stadt). Der Halt bei R T18 stammt aus der PULSE-Straßenregel von `.181`, nicht aus R5.

## 5. Ursachenepisoden der 35 `scene_context`-Ablehnungen

| Episode | Ablehnungen | Konstellation (Szene der Meldung → Ort der Engine) | Einordnung |
|---|---:|---|---|
| W T12 #24 | 5 | Weiler (Elternort) → neues Langhaus darin, Ankunft gebucht | vermeidbarer Extractorfehler; Engine könnte tolerieren |
| W T20 #40 | 7 | Reich (Straße) → Langhaus, keine Ankunft gemeldet | **berechtigte Schutzablehnung** mit Kollateralverlust |
| W T47 #94 | 7 | Langhaus → Pferchtor, Ankunft `no_go` | berechtigt nach Vertrag; Kartenformulierung lädt ein |
| R T18 #36 | 10 | Ashbridge → Reichsstraße (PULSE-Halt) | **Architektur-/Datenwiderspruch** (Ortshierarchie), dazu ein Extractorfehler |
| R T20 #40 | 6 | Ort in Ashbridge → Reichsstraße vor der Ankunft | dieselbe Ursache |

### W T12 – Ankunft gebucht, Inhalte verloren · **präzisiert**

- **Ablauf:** „I follow Hedwin to the long house“ wird zu GO `{new:"the long house"}` im Weiler-Habitat. Die Engine legt `loc.the_long_house_by_the_mill` als Kind des Weilers an und bewegt Alaric dorthin.
- **Fehler:** Der Extractor nennt als Gesamtszene den **Weiler**, also den Ausgangs- und Elternort, obwohl der Ankunftsschritt am Anfang steht. Nach seinem Vertrag ist die Gesamtszene die Endszene (`extract.js`: „the final scene is not retroactive“). Er hätte `{new: …long house…}` angeben müssen, wie er es bei T63 richtig tut.
- **Folge:** Fünf Deltas nach der Ankunft tragen implizit die Weilerszene und werden abgelehnt. Verloren gehen Hedwins Frau, drei Fakten zum Raubmuster und ein früherer Gildenmann sowie ein Thread.
- **`met_without_arrival` trotz Ankunft:** Das ist kein Widerspruch der Bewegung, sondern ein struktureller E2-A-Befund (Abschnitt 7). Folgenlos, denn Hedwin kam als `with` mit.
- **Engineseitig denkbar:** Eine Szenenangabe, die die **Siedlung oder den Lebensraum** des aktuellen Orts nennt (nicht Reich oder Region), nach einer gebuchten Ankunft darin wie „hier“ behandeln.
- **Häufigkeit:** Dieselbe Konstellation trat in `.186` 5× ohne verweigerte Ankunft auf. In `.188` kam sie 6× vor, dort aber mit verweigerter Ankunft; diese Ablehnungen blieben auch mit der Toleranz bestehen.

### W T20 – Erzählung reist ohne GO · **bestätigt, präzisiert**

- **Ablauf:** Der Spieler isst, spricht mit Wat, schneidet das Ohr ab und verabschiedet sich. Kein GO.
- **Grenzverletzung:** Der Erzähler lässt Hedwin ihn zum Weg bringen und erzählt dann die Straße am Mühlbach mit fremden Spuren. Der Extractor meldet keine Ankunft und als Gesamtszene das Reich. Die Engine hält Alaric richtig im Langhaus.
- **Kollateralverlust:** Alle sieben Deltas tragen die Endszene und werden abgelehnt, auch diese:
  - Marrens Brot und Käse (`object.new` plus `object.move` an Alaric: ein **tatsächlicher Gegenstand**),
  - Hedwins Zuneigung (+15) und sein Stimmanker,
  - eine Erinnerung und die Wegbeschreibung.
  Das geschah alles noch im Weiler.
- **Die Spuren-Thread-Ablehnung ist richtig.** Mit ihr verschwindet auch die Erzählung des offenen PULSE-Spurenfensters.
- **Keine Reparatur:** Die Chronologieprüfung des Validators fordert Einzelszenen nur, wenn ein `arrive` vorliegt. Hier wurde keine Reparatur ausgelöst.
- **Nicht lockern:** Wie GPT halte ich eine Lockerung von D3 für falsch. Eine automatische Teilreise wäre ein Eingriff in die Spielerhoheit. Der Kollateralverlust ist der Preis eines konservativen Schutzes. Er wäre nur über eine Extractor-Reparatur bei „Gesamtszene ≠ Engine-Ort ohne Ankunft“ zu verringern, und die kostet einen Modellaufruf (P3).

### W T47–T48 – Nichtankunft und wirksame Rückführung · **bestätigt, präzisiert**

**T47:**
- Der Spieler nimmt Hedwins Einladung an: „Stew would be welcome … if you'll talk while we eat“.
- Der Planner gibt nach Regel 7d (fremdes Angebot oder bloße Zustimmung ist kein GO) leere Kommandos. Seine Begründung im Originalrequest: „acceptance of hospitality, no command needed“.
- Die Narrator-Karte enthielt `WHERE — the pen gate` und `TRAVEL THIS TURN — none chosen: he stays at the pen gate by the pond unless something in the world moves him.`
- Der Erzähler lässt Hedwin „led the way“ ins Langhaus gehen und nutzt damit offenbar genau das „unless something in the world moves him“.
- `arrive` wird `no_go`, sieben Folgemeldungen werden als Chronologiefall abgelehnt, `NOT ARRIVED` steht im Panel.

**T48:**
- Im Narrator-Request stehen nachweislich `WHERE — the pen gate … The last reply's the long house by the mill was not reached`, die unveränderte TRAVEL-Zeile und die N4-Marke an der vorigen Antwort.
- Der Erzähler führt die Szene zurück: Hedwin „started toward the long house“ und bleibt an den Spuren am Tor stehen. Alles wird gebucht, keine Ablehnung.

**N1/N4 wirken also.** Der Preis: Was die verworfene Szene erzählte, wird nie kanonisch, nämlich Hedda als neue Person und Hedwins Lebensgeschichte (Garrick, Blackgate). Die angenommene Einladung wird nie eingelöst; T49 bleibt am Tor, T50 geht es zurück.

**Möglicher enger Fix (P2):** Die TRAVEL-Zeile nennt „something in the world“ als äußere Gewalt. Sinngemäß: „only a force he cannot refuse moves him; someone leading the way or an invitation does not“. 7d selbst bleibt.

### Rogue T18–T20 – PULSE-Halt, nachgeholte Personen · **in der Ursache widersprochen**

**Wurzel (bestätigt, älter als `.190`):** Das Gildenbrett legte bei T7 den Jagdort „**Millrace Row culvert, Ashbridge**“ als `realm.duskreach.millrace_row_culvert_ashbridge` an, also direkt unter dem Reich. `guild.js` `bookBoard` hängt jeden neuen Jagdort an `realmOf(branch)`. Der Name sagt „Ashbridge“, der Auftraggeber sind die „Laundry-wives of Millrace Row“, und das benachbarte „flooded end of Millrace Row“ liegt korrekt unter `loc.ashbridge`. Jeder Gang zwischen Stadt und Durchlass ist damit für die Engine eine **Reise durchs Reich**:

| Zug | Weg | Engine-Buchung |
|---|---|---|
| T9 | Gildenhalle → Durchlass | Straßen-PULSE (`travel`, offen: Hindernis) → Halt am „flooded end of Millrace Row“ |
| T14 | Haus der Witwe Hesse → Durchlass | **45 min** Reisezeit, Straßen-PULSE |
| T18 | Durchlass → Gildenhalle | Straßen-PULSE (offen: Gefahr) → Halt **auf der Reichsstraße** „On the way to …“ |
| T20 | Straßenhalt → Gildenhalle („a hundred steps away“) | **50 min** Reisezeit |

**T18:**
- Der Erzähler erzählt richtig die Stadtgassen (Millrace Row, Gerbereien, Marktplatz) und dort die drei Räuber in der Gasse beim Küfer.
- Der Extractor nennt als Szene `loc.ashbridge`. Das ist erzählerisch wahr, aber kein Halt. Er meldet `arrived:false` mit `at:null` und **kein `arrive` für den Halt**, obwohl sein Vertrag genau das verlangt („A reported intermediate stop on an authorized GO is arrive at the actual stop“).
- Die Engine bucht nach `.181` P2-2 bei offenem Straßenfenster den Halt auf der Reichsstraße. Alle zehn Gassen-Deltas werden abgelehnt: drei Räuber, ihre Positionen und ihr Bemerken, der Drohungs-Thread.

**Gegenprobe T18:**
- Nur `expected.1.at = loc.ashbridge` ändert nichts.
- Mit einem zusätzlichen `arrive` nach `loc.ashbridge` werden **alle zehn Deltas gebucht**, und Alaric steht in Ashbridge.
- Der Erzähler hat also nichts Unzulässiges getan. Verursacht haben es die falsche Hierarchie und ein fehlendes Halt-`arrive`.

**T19, die nachgeholte Buchung:**
- Der Spieler antwortet den Räubern. Der Extractor meldet sie mit Szene „here“ als neu, und die Engine bucht sie in einem geschlossenen PULSE-Fenster.
- Das ist **keine Regelverletzung**:
  - Neue Personen sind nicht PULSE-gebunden; die Straßen- und Gruppenregeln gelten für Kreaturen.
  - Die T18-Erzählung steht unmarkiert in der Historie, denn N4 markiert nur verweigerte Ankünfte.
  - Die Buchung holt bereits Erzähltes nach und stellt die Konsistenz wieder her.
- **Nebenfolgen:**
  - Die PULSE-Bilanz führt das Gefahrenfenster von T18 als `narrated:none` und T19 als „neuer Inhalt im geschlossenen Fenster“. Beides ist ein Auswertungsartefakt.
  - Die Erinnerungen tragen den Ort „On the way to Adventurers' Guild hall“ statt der Gasse.

**T20:**
- GO zur Gildenhalle, Ankunft gebucht.
- Der Extractor ordnet die sechs Gassen-Deltas vor der Ankunft dem bekannten, aber falschen Ort „flooded end of Millrace Row“ zu. Die Engine stand auf der Reichsstraße, also werden alle sechs abgelehnt.
- Verloren gehen die offene Drohung („the row's long, friend, and you'll sleep in it“), die Aktualisierungen beider Threads und das Weggehen der drei Männer.
- Die Personen bleiben trotzdem richtig zurück, weil die Ankunft die Anwesenheit zurücksetzt.

**Folgerung:**
- Mit der Ortshierarchie aus P1 gäbe es weder Straßen-PULSE noch Reichshalt noch 95 Minuten Stadtreisezeit.
- Die verbleibende Szenenangabe `loc.ashbridge` wäre die Siedlung des aktuellen Orts, also genau die T12-Konstellation.
- GPTs Lesart („das offene PULSE-Gefahrenfenster hält ihn tatsächlich unterwegs“) beschreibt die Buchung zutreffend, aber nicht ihre Ursache. **Der Halt auf der Reichsstraße ist selbst die Folge des Fehlers.**

## 6. Dungeonarchitektur B5

### T62/T63 – Tor und erste Sektion · **bestätigt positiv**

- **T62:** Fortsetzung der Absicht. Ankunft am Tor `loc.mossback_warrens`, `dungeon.established`, Torkarte mit „ENTER DUNGEON? — he goes in when he says so (this card books nothing)“.
- **T63:** GO `{new:"into the open Mossback entrance"}`. Die Engine kündigt „on into part 1 of level 1“ an, setzt `dungeon.ahead` auf den Slot `scouts` und bucht erst mit der bestätigten Ankunft:
  - genau ein `place.created` `loc.mossback_warrens.l1_s1` (`by: dungeon`, Ebene 1, Abschnitt 1),
  - `link.set` Tor ↔ s1, `scene.moved`, `dungeon.part`,
  - `dungeon.slot` mit zwei Ausguckposten auf Stufe 2/3.
- Der Extractor übernimmt den Vorschaunamen wörtlich. Die Gildenprüfung (registrierte Mitglieder, keine Gebühr) läuft korrekt.
- Beiläufig erzählte Nebenhöhlen werden nicht gebucht. Das ist richtig.

### T70 – abgelehnte Speerträger, gespeicherter Thread · **bestätigt, Ursache präzisiert**

**Ist die Kausalität belegt? Ja, und sie beginnt bei der Engine.** Die Narrator-Karte von T70 (Originalrequest) enthält zugleich:
- `LEVEL 1 …: 2 goblin spearman (foes): not met … The story may give a visible foe a creative appearance within one uniquely matching free slot of this level (same body plan and count), even before an earlier encounter is resolved` (`living.js:942`, seit `.70`),
- `STATE NOW — BINDING (end the reply so; no other foe)` und „no extra … combatants“ aus dem Kampfblock.

Der Erzähler zeigt zwei Speerträger, also genau den freien Slot `warband` (2 goblin spearman). Er folgt damit der Dungeon-Zeile und bricht die Kampfzeile.

**Warum die Firewall den Slot nie annimmt:**
1. Der Extractor meldet die Neuankömmlinge vertragsgemäß mit `more: true`, und `slotForNew` schließt den kreativen Pfad bei `more === true` aus. Ergebnis: `dungeon_foe`.
2. **Gegenprobe:** Mit `more:false` oder `null` lehnt die Kampfregel jede neue Kreatur während eines laufenden Kampfes ab (`world_rule`: „new creature … during the fight“).
3. Nach B5 liegt `warband` fest in **Abschnitt 2**: Takt `[0,0,1]`, Kartenzeile „on: part 2 of level 1 (not seen yet)“.

Die Einladung der Karte ist also im Kampf **strukturell nie erfüllbar**, und nach B5 widerspricht sie zusätzlich den festen Slotpositionen. Der Ablehnungstext „goblin warrior is no encounter of this level“ ist irreführend, denn es ist ein Slot dieser Ebene, nur nicht dieses Abschnitts.

**Wurde nichtkanonisches Wissen dauerhaft gespeichert? Ja.**
- `thread.t66.1` ist ein bestehender **sign**-Thread (das Heulen aus dem tiefen Tunnel).
- Er wurde von T67 bis T70 viermal fortgeschrieben, mit wachsender Annäherung („a third goblin answered“, „the knock of a spear-butt“).
- Bei T70 ersetzt die Aktualisierung seinen Text durch „… as the **two spear-goblins advanced**“.
- Offene Threads stehen im THREADS-Katalog des Extractors, gekürzt.
- Sie erscheinen als `Open thread (<Art>): …` (Gewicht 0,7, `context.js`) auch in der RELEVANT-Auswahl der Narrator-Karte, wenn die Auswahl sie trifft. Belegt ist das bei R T21: Die Karte trägt den offenen Räuber-Thread in seiner T19-Fassung.
- Der Lauf endet bei T70, die Wirkung dieses Threads ist unbeobachtet.
- Der stärkere Träger bleibt ohnehin die T70-Erzählung selbst in der Historie, denn sie trägt nur eine Korrekturzeile, keine N4-Marke.

**Welche Prüfung müsste ablehnen?** Es gibt schon eine: `dungeon_foe_thread` (`world.js`, `unbookedDungeonThreat`). Sie greift aber nur bei:
- Threads der Art `threat`,
- und nur, wenn der Text die abgelehnte **Art** („goblin warrior“) oder „zwei Gestalten/Kreaturen“ nennt.

Hier ist der Thread ein `sign` und sagt „spear-goblins“. Enge Lösung:
- Eine Thread-Meldung dieser Antwort, deren **neuer Text** eine in dieser Antwort abgelehnte Kreatur als hier gegenwärtig oder handelnd behauptet, wird abgelehnt.
- Das gilt **für jede Thread-Art** und erkennt die Kreatur über Ref, Art, Anker-Wort (goblin) mit Anzahl.
- Bei einer Aktualisierung bleibt die **bisherige Fassung** stehen.

**Was nicht verloren gehen darf:**
- die frühere Fassung desselben Threads (das Heulen),
- Threads über Geräusche ohne die abgelehnte Kreatur,
- Spuren-Threads wie `thread.t61.1` (Stiefelabdrücke),
- Berichte Dritter („traders say …“),
- Threads über von der Engine gebuchte Gegner und Auflösungen.

Keine Pauschalablehnung aller Threads nach einer verweigerten Kreatur.

**Ursachenfix (P1):** Die Slot-Einladung der Dungeon-Karte während eines Kampfes und für Slots späterer Abschnitte streichen. Erhalten bleibt sie nur für den Slot, den die Engine für diesen Schritt vorab gesetzt hat (`dungeon.ahead`).

## 7. NPC E2/E3 und PULSE

### Wiederbegegnungen und `met`

Der Warrior hat fünf erzählte Wiederbegegnungen und **0 angenommene `met`**. Die Einzelprüfung:

| Zug | Meldung | Grund | Folge |
|---|---|---|---|
| W T8 | `npc.millpond_farmer` | falsche Ref-Form, zugleich Erstbegegnung | folgenlos |
| W T12, W T45, **R T13** | met bei GO mit **Wortziel** `{new}` | `metArrivals` verlangt `g.to` (Orts-ID). Bei Wortzielen ist es `null`, met wird **immer** abgelehnt. Bei R T13 ist `known_at` leer, weil „Widow Hesse at the blue door“ nicht zu „Widow Hesse's house“ aufgelöst wird | **R T13: Witwe Hesse bleibt an Tanner's Close zurück**, während sie Alaric vor ihrer eigenen Tür empfängt; ihre Fakten werden gebucht, ihre Anwesenheit nicht |
| W T38 | Marren | zusammengesetztes Belegzitat | T39 per `enter` nachgeholt |
| W T40 | Wat | „once stood over a dead wolf“ als hypothetisch gelesen (Fehlalarm) | Wat trotzdem anwesend |

**Struktureller E2-A-Befund (P2, bestätigt, seit `4d8d2a0` vom 08.11.):** `met` muss am **tatsächlich erreichten Ort** des Schritts gemessen werden, nicht an `g.to`. Dazu gehören auch die dort bekannten Personen. GPTs „Lücke der Abdeckung“ ist also zum Teil ein Codefehler.

### Weitere NPC-Befunde

- **Gildenbearbeiter (E2-A R2):** 0 von 5 bzw. 0 von 2 angenommen. Gründe: „quote joins several places“, „no one is named before the pronoun“. Der Mechanismus kommt im natürlichen Spiel nicht zum Tragen (P3, beobachten).
- **E3-Anker:** Warrior 3 und Rogue 1 gespeichert, 3 später vollständig auf der Karte. Die gespeicherten Anker sind dauerhafte Züge, keine Stimmungen (z. B. „boastful pride in being right, settling matters with a spit“). Ankeränderungen sind nicht abgedeckt.
- **Gemeinsame Reisen:** Warrior 3 (T12 Hedwin, T40/T41 Marren/Wat). Die `with`-Mitnahme funktioniert.

### PULSE

- Warrior 37 Würfe / 5 offen, Rogue 14 / 3 offen. Straßengefahr W T29 (Wildschweine) mit korrekter Ein-Gruppen-Regel.
- **Alle drei als `open_window_not_narrated` markierten Fenster wurden erzählt:**
  - W T20 (Spuren am Bach, abgelehnt mit `scene_context`),
  - W T21 (Lichtschein über dem Teich, als Thread gebucht),
  - W T48 (zweite Fährte am Tor, als Thread gebucht).
- `pulse.outcome.narrated` zählt nur Entitäten, Features, Objekte und Orte, **keine Threads**. Für Spuren- und Seltsam-Fenster lautet es daher systematisch „none“.
- Das ist rein diagnostisch, ohne Zustand und ohne Einfluss auf das Würfeln (P3).

## 8. Spielgefühl und weitere Beobachtungen

**Sieben Angriffseingaben werden komplett verworfen (P2 für den User-Test, älter):**
- W T14, T31, T35, T43, T64, T65 und R T16 enden mit `illegal: … no declared movement brings it into range`.
- Vier davon sind Konter- oder Lauerangriffe („meeting the wolf's charge … the moment it comes in range“), die die Engine nicht kennt.
- Zwei sind ausdrücklicher Sturm über 30 Schritte („I close the thirty paces quickly and strike“): Der Planner gibt `move` plus Angriff, ein Zug deckt aber nur eine Distanzstufe. Weil der Angriff unzulässig ist, **unterbleibt auch die Bewegung**.
- Der Erzähler muss zweimal einen ausgebliebenen Ansturm erzählen.
- Für persönliche Tests ist das spürbar. Enge Option: Den Bewegungsteil ausführen und den Angriff mit klarer Begründung stehen lassen.

**Stadtreisezeit:** 45 bzw. 50 Minuten für Wege innerhalb von Ashbridge (Folge von P1).

**Lange Aufrufe:**
- 12 Aufrufe dauerten über 60 s, darunter W T40: Erzähler 221 s mit Längenabbruch bei 8.192 Tokens und 33.567 Zeichen Reasoning.
- Alle fünf Extractor-Längenabbrüche (W T8/T22/T36, R T5/T21) wurden durch die Reparatur aufgefangen.
- Das ist Modellverhalten, keine Architekturfrage. Es erklärt einen Teil der Laufzeit; eine Leistungsaussage gegenüber `.188` ist nicht belegt.

**Wirtschaft:**
- Drei Gildenauszahlungen korrekt (Warrior 2, Rogue 1).
- Doppelzahlungsschutz greift (`guild_payout`).
- Verkauf an Marta 23 cp, Unterkunft 11 + 2 cp.
- Primer-Kauf mangels Geld korrekt nicht gebucht.
- Keine Fehlbuchung.

## 9. Gegenbewertung zum GPT-Review

| GPT-Aussage | Urteil | Begründung |
|---|---|---|
| 35 `scene_context` aus fünf Episoden (19 in 3, 16 in 2 Antworten) | **bestätigt** | eigene Einordnung je Meldung (Abschnitt 5) |
| Kennzahlen 218/73 Aufrufe, je 9 Reparaturen, 6/2 Längenabbrüche, Events identisch | **bestätigt** | dazu exakter Replay-Nachlauf 137/137 und 41/42 |
| T12: konkurrierende Szenenreferenzen; `met_without_arrival` trotz Ankunft | **präzisiert** | Der Extractor verletzt die Endszenenregel (Elternort statt neues Langhaus). Der `met`-Befund ist strukturell (Wortziel), hier folgenlos |
| T20: Schutz richtig, Verlust erzählter Inhalte; keine D3-Lockerung | **bestätigt, präzisiert** | Verloren ist auch ein echter Gegenstand (Brot/Käse) samt Zuneigung und Anker. Ohne `arrive` löst der Validator keine Reparatur aus |
| T47/T48: belegter positiver N1/N2/N4-Fall | **bestätigt, präzisiert** | Auslöser ist eine angenommene Einladung (Planner nach 7d korrekt), und die TRAVEL-Zeile lässt „something in the world“ offen. Die Rückführung kostet Hedda und Hedwins Geschichte. Das T48-Spurenfenster wurde erzählt |
| Rogue T18: „PULSE-Fenster hält ihn tatsächlich unterwegs“; Extractor-Szene statt gebuchtem Halt | **in der Ursache widersprochen** | Der Reichshalt ist Folge der falschen Hierarchie des Gildenbretts (Durchlass unter dem Reich). `loc.ashbridge` war erzählerisch richtig. Gegenprobe: Ein Halt-`arrive` bucht alles |
| T19: nachgeholte Buchung „nicht eindeutig“ | **entschieden: keine Regelverletzung** | Neue Personen sind nicht PULSE-gebunden. Die Buchung holt Erzähltes nach; Nebenfolgen sind nur Bilanz- und Erinnerungsartefakte |
| T20 (Rogue): Drohung verloren | **bestätigt** | Ursache wie T18 |
| B5 T62/T63 positiv | **bestätigt** | |
| T70: Erzähler „erfindet“ Goblins; abhängiger Thread gespeichert | **bestätigt, Ursache präzisiert** | Die Karte lädt ein (`living.js:942`, seit `.70`), die Firewall kann nie annehmen. Der Thread ist die Aktualisierung eines bestehenden `sign`-Threads; der vorhandene Schutz deckt nur `threat` ab |
| 0 angenommene `met`: Abdeckungslücke | **präzisiert** | zum Teil Codefehler (Wortziele) mit sichtbarer Folge bei R T13 |
| PULSE ohne sichere Regelverletzung; Prüfhinweise semantisch | **bestätigt, ergänzt** | Die drei „not narrated“-Hinweise sind Fehlalarme der Thread-blinden Heuristik |
| Keine Performanceaussage; keine weitere Architekturänderung | **bestätigt** | |
| Rogue/Mage nach Guthaben erneut natürlich spielen | **bestätigt** | Siehe Abschnitt 12 |

## 10. Antworten auf die Fragen

1. **Wirkt die gemeinsame Bewegungsautorität zuverlässiger?**
   - Ja: 25 von 26 Schritten erreichen ihr Ziel, 0 werden von der Engine verworfen, 1 unautorisierte Ankunft in einer Folge von einer Antwort.
   - `.188` hatte 11 unautorisierte Ankünfte in 10 Folgen, bis zu drei Antworten lang.
   - Richtwert bei kleinem n und verschiedenen Kampagnen.
2. **Hat B5 den ersten Abschnitt korrekt beherrscht?** Ja: genau eine Sektion, Link, Slot und Stufen aus der bestätigten Ankunft. Die festen Slotpositionen hielten auch gegen die erzählten Speerträger.
3. **Hat N1/N4 eine falsche Szene zurückgeführt?** Ja, im einzigen Fall (T48), sofort und ohne neue Ablehnung. Das ist ein Einzelfall, keine Statistik.
4. **Welche Informationsverluste bleiben?**
   - W T12: Hedwins Frau, drei Fakten, ein Thread.
   - W T20: Brotgeschenk, Zuneigung, Anker, Erinnerung, Weg.
   - W T47: Hedda, Hedwins Geschichte.
   - R T18/T20: Räuberbegegnung um einen Zug verspätet, die spätere Drohung und die Thread-Fortschreibung verloren.
   - R T13: Anwesenheit der Witwe Hesse.
   - Dazu kommt ein abhängiger Falsch-Thread (W T70).
5. **Neu oder alt?** Alle Ursachen sind älter als `.190`:
   - Hierarchie der Jagdorte (`.132`),
   - Slot-Einladung und `more`-Ausschluss (`.70`),
   - `met` an `g.to` (E2-A, 08.11.),
   - Szenenprüfung je Schritt (`.177`/`.181`).

   B5 macht den Kartenwiderspruch schärfer. Ein `.190/.191`-Rückschritt ist nicht nachweisbar. Der Nachlauf reproduziert die Records exakt, und die verantwortlichen Codestellen stammen aus Commits vor `.190`.
6. **Was ist noch nicht natürlich abgedeckt?**
   - Dungeon: Ebenenende, Abstieg und Siegel (G1), Ebene 2, Wächter und Boss, Erneuerung, Dungeon-PULSE und Wanderer.
   - Orte: Gebäudeblocker (G2/G3b), widerlegter Bericht (G4), Rückkehr zu einem Ort unter anderem Namen.
   - Verhalten: durch PULSE unterbrochene Rast; Absprachen aufgegriffen oder erledigt; Ankeränderung; Gildenbearbeiter.
   - Komplette Läufe: ganzer Mage-Lauf (Magie, Ward/Bolt) und der Rogue über T21 hinaus.
7. **Was ist vor weiteren persönlichen User-Tests technisch notwendig?**
   - **P1-a:** Die Slot-Einladung der Dungeon-Karte auf den vorab gesetzten Slot des Schritts beschränken, nicht im Kampf und nicht für spätere Abschnitte. Dazu die Thread-Ablehnung bei abgelehnten Kreaturen für jede Thread-Art.
   - **P1-b:** Jagdorte des Gildenbretts, die in der Gildenstadt liegen, unter die Siedlung legen.
   - **Empfohlen:** P2-a (`met` am erreichten Ort), P2-b (Siedlungs-/Habitatszene nach gebuchter Ankunft), P2-c (TRAVEL-Zeile).

## 11. Priorisierte Befunde

| Nr. | Befund | Status | Prio | Enger Korrekturvorschlag |
|---|---|---|---|---|
| P1-a | Dungeon-Karte lädt zu Slot-Auftritten ein, die die Firewall nie annimmt (`more: true`, laufender Kampf, B5-Abschnitt); ein `sign`-Thread speichert die abgelehnten Gegner | **bestätigt** (Originalrequest, Gegenprobe) | P1 | Einladung nur für den `dungeon.ahead`-Slot dieses Schritts, nie im Kampf. Thread-Meldungen, die eine in dieser Antwort abgelehnte Kreatur als gegenwärtig nennen, für jede Art ablehnen (Aktualisierung → alte Fassung bleibt). Ablehnungstext „not in this part of level N“ |
| P1-b | Gildenbrett hängt Jagdorte in der Gildenstadt unter das Reich → Stadtwege als Reichsreisen (Straßen-PULSE, Reichshalt, 45–50 min), Szenenverluste | **bestätigt** (Record, Code `guild.js` `bookBoard`, Gegenprobe) | P1 | Nennt der Ort die Gildenstadt („…, Ashbridge“) oder liegt er nach der Beschreibung des Generators in ihr, wird die Siedlung der Elternort. Andere Jagdorte bleiben unter dem Reich |
| P2-a | `met` bei GO mit Wortziel strukturell unmöglich; Anwesenheit der Person geht verloren (R T13) | **bestätigt** | P2 | `metArrivals` misst am tatsächlich erreichten Ort des Schritts und an dessen bekannten Personen |
| P2-b | Szenenangabe = Siedlung oder Lebensraum des aktuellen Orts wird abgelehnt (W T12; ebenso `.186` 5× ohne verweigerte Ankunft) | **bestätigt**, Extractor verletzt Endszenenregel | P2 | Diese Angabe als „hier“ werten, solange in der Antwort keine Ankunft verweigert wurde; nie für Reich oder Region (W T20 bleibt abgelehnt) |
| P2-c | TRAVEL-Zeile „unless something in the world moves him“ öffnet NPC-geführte Ortswechsel (W T47) | **präzisiert** | P2 | Wortlaut auf äußere Gewalt beschränken; 7d unverändert |
| P2-d | Ganze Angriffseingabe verworfen, auch der Bewegungsteil (7 Fälle) | **bestätigt** (älter) | P2 | Bewegung ausführen, Angriff mit Distanzbegründung verwerfen; Konter weiter offen |
| P3-a | Erzählter Ortswechsel ohne GO verwirft auch die Vor-Ort-Deltas (W T20) | **bestätigt**, Schutz berechtigt | P3 | optional: Extractor-Reparatur bei Gesamtszene ≠ Engine-Ort ohne `arrive` (kostet einen Aufruf) |
| P3-b | `pulse.outcome.narrated` ignoriert Threads | **bestätigt** | P3 | `thread.set` in einem offenen Spuren- oder Seltsam-Fenster mitzählen |
| P3-c | Gildenbearbeiter-Belege nie angenommen (0/7) | **offen** | P3 | beobachten; Belegprüfung erst nach weiteren Fällen anpassen |
| P3-d | `met_evidence` liest „once stood“ als hypothetisch (W T40) | **bestätigt**, folgenlos | P3 | beobachten |
| P3-e | Runner führt Guthabenstopps als `extractor_failed`/`process_error` | **bestätigt** | P3 | eigene Endart; Abbruch bei 402 in der Vorabprobe |
| – | „Szenenchaos“ als neue Architekturfolge von `.190` | **widerlegt** | – | Ursachen datiert älter; Reiseketten deutlich gesunken |

## 12. Mögliche Regressionsfälle

Alle Fälle stammen aus den Originalrecords. Sie lassen sich über den lokalen Korpus (Anhang A) ohne Modellaufruf ausführen.

1. **W #140 (T70), Originalantwort:**
   - `creature.new` bleibt `dungeon_foe`, `aware` bleibt `creature_continuity`.
   - **Neu:** Die Aktualisierung von `thread.t66.1` wird abgelehnt, ihr T69-Text bleibt, kein gespeicherter Thread enthält „spear-goblin“.
   - Positiv: dieselbe Antwort ohne den Goblin-Nebensatz → Aktualisierung angenommen. Ebenso ein neuer `sign`-Thread „something hooted again“.
2. **Narrator-Karte vor W #140:** Keine Slot-Einladung im Kampf und keine für den Abschnitt-2-Slot `warband`. Positiv: Beim GO in einen neuen Abschnitt mit `dungeon.ahead` bleibt der kreative Auftritt dieses Slots möglich.
3. **R #14 (Brett T7):**
   - „Millrace Row culvert, Ashbridge“ erhält den Elternort `loc.ashbridge`. „Windmill Gully“, „reed-bank paths of the Reed Flats“ und „Thornwood Edge charcoal camps“ bleiben unter `realm.duskreach`.
   - Folgeprobe: GO vom Durchlass zur Gildenhalle ist `local`, ohne Straßen-PULSE und ohne Reisezeit über die Stadtkappe hinaus.
4. **R #36 (T18):** Auf korrigierter Hierarchie werden die drei Räuber in T18 gebucht. Auf dem Originalzustand bucht bereits die Variante mit Halt-`arrive` alle zehn Deltas (nachgewiesen).
5. **W #24 (T12), Originalantwort:** Hedwins Frau, drei Fakten und der Thread werden im Langhaus gebucht (P2-b). Negativ: W #40 (T20) bleibt mit sieben Ablehnungen (Reichsszene, keine Ankunft).
6. **R #26 (T13):** Witwe Hesse ist nach der Ankunft an ihrem Haus anwesend (`met` am erreichten Ort). Negativ: `met` eines Schritts mit verweigerter Ankunft bleibt abgelehnt.
7. **W #96 (T48):** `pulse.outcome.narrated` = `likely`, wenn im offenen Spurenfenster ein `sign`-Thread gebucht wird.
8. **W #127 (T64):** Der Bewegungsteil wird ausgeführt (LONG → MEDIUM), der Angriff mit Distanzbegründung verworfen (nur bei P2-d).
9. **Gesamt:** voller Replay (2235 Fälle) mit Fingerprint-Abnahme. Dazu die beiden `.191`-Läufe als neue natürliche Korpusläufe (`w191`, `r191`, vollständig zuordenbar), damit dieser Batch künftig Teil der Abnahme ist.

## 13. Empfehlung

1. **Kleiner Korrekturbuild** mit P1-a und P1-b, idealerweise mit P2-a bis P2-c:
   - je Befund zuerst rot am Originalrecord, dann eng korrigiert;
   - `npm test`, voller Replay mit Fingerprints und isolierter ST1.19-Smoke (Standard und Failsoft);
   - die zwei `.191`-Läufe in den Replay-Korpus aufnehmen.
2. **Den persönlichen User-Test gezielt auf Ungeprüftes lenken:**
   - einen Gildenauftrag mitten in der Stadt (Keller, Durchlass),
   - eine Einladung eines NPCs in sein Haus,
   - eine Rückkehr zu einer bekannten Person an ihrem Wohnort,
   - einen Dungeonkampf, in dem weitere Gegner hörbar werden,
   - danach Ebenenende und Abstieg,
   - eine verschlossene Tür in einem Stadtgebäude,
   - einen Sturmangriff über Distanz.
3. **Rogue und Mage** nach Wiederherstellung des Guthabens natürlich neu spielen, mit neuem Runnerordner und Seed. Den Warrior nicht nur zur Vervollständigung wiederholen. Die Guthabenstopps bestätigen, dass der verbrauchsabhängige Tarif für Batches zu knapp ist.
4. **Kein weiterer Architekturumbau.** Die Bewegungsautorität hält. Offen sind gezielte Daten-, Karten- und Belegfragen.

---

### Anhang A – Gegenproben (Methode)

Die Hilfsskripte liegen nur in der Arbeitsumgebung des Reviews und sind nicht Teil des Repositorys. Nachbau:

1. **Korpus bauen:**
   - Aus `ALL_MODEL_RESPONSES_COMPACT.jsonl` je Profil eine `chat-completions.jsonl` mit den Feldern `role`, `turn`, `response` schreiben und neben die `chat.jsonl` legen.
   - Dann `node tools/replay/build_corpus.mjs <out> w191=<warrior dir> r191=<rogue dir>` ausführen.
   - Ergebnis: 150/150 bzw. 52/53 Antworten zugeordnet, eine als Providerfehler.
2. **Nachlauf:** `node tools/replay/replay.mjs --corpus <out> --original` ergibt Warrior 137/137 und Rogue 41/42 identisch (Abweichung: Fehlertext #44).
3. **Gegenprobe einer Antwort:**
   - Chat bis Index *i* kopieren, eigenen Record entfernen.
   - `runtime.processReplyAny` und `runtime.runExtraction` mit einem Modellersatz aufrufen, der die aufgezeichnete Extractor-Antwort nach einer Umformung zurückgibt.
   - Die verwendeten Umformungen:
     - **W #140:** `more:false` und `more:null` am `creature.new` → `world_rule` (Kreatur während des Kampfes), Thread weiter gespeichert.
     - **R #36:** `expected.1.at = "loc.ashbridge"` → unverändert zehn Ablehnungen.
     - **R #36:** zusätzlich `arrive` nach `loc.ashbridge` als Schritt 2 (Folgeschritte +1) → 0 Ablehnungen, drei Personen, Positionen, Bemerken und Thread gebucht, Alaric in Ashbridge.
4. **Szeneneinordnung:**
   - Für jede `delta.rejected` mit `scene_context` den Ort der Engine am Schritt bestimmen: Zustand vor der Antwort plus `scene.moved` der Antwort in Eventreihenfolge.
   - Ihn mit `scene` der Meldung bzw. der Gesamtszene vergleichen (Vorfahr der Art Siedlung/Lebensraum, Vorfahr Reich, sonstiges; mit oder ohne verweigerte Ankunft in derselben Antwort).
   - Angewandt auf `.186`, `.188` und `.191`.
