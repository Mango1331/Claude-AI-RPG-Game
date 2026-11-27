# Avereth .261 – Extractor-Recovery und Teilübernahme

Alle drei Befunde aus dem Gegenreview zu .260 ließen sich offline reproduzieren. Der Kandidat erhält in einem normalen Gespräch wieder eine zweite Chance auf einen lesbaren Weltbericht. Liefert X bereits einen brauchbaren Bericht, werden seine unabhängigen gültigen Angaben im selben Zug verarbeitet. Der persönliche Usertest wartet auf den unabhängigen GPT-Diffreview.

Produktbasis ist `7bdb570103d8876cb2a0ff7cac8c8de83e9b1e79`, Kandidat `4.3.0-c.6.6.261`. [Diff ab .260](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/7bdb570103d8876cb2a0ff7cac8c8de83e9b1e79...4b637c981459e1e5ff9f4bd480bc071723fe5bce) · [Vorgängerabnahme](AVERETH_252_VALIDIERUNGSVEREINFACHUNG_ABNAHME.md)

## Was die Engine entscheidet

| Befund | Rot auf .260 | Verhalten auf .261 |
|---|---|---|
| R1 · technischer Ausfall | Ein Gespräch ohne gebuchte Aktion endete nach einer leeren Antwort, einem temporären Transportfehler oder unlesbarem JSON jeweils mit `failed`. | In allen drei Fällen führt eine gültige zweite Antwort zu genau einer Faktbuchung. Ein erneuter Aufruf für dieselbe abgeschlossene Nachricht bucht nichts. |
| R2 · drei feste Typnamen | `object` und `creature` scheiterten schon als unbekannte Typen. Auch `person` hatte diesen Fehler. | Die bestehende Formatnormalisierung übersetzt ausschließlich diese drei Schreibweisen in den gleichnamigen `.new`-Typ. Schema, Referenzen, abhängige Deltas und World entscheiden anschließend wie beim ausgeschriebenen Typ. |
| R3 · Zusatzfeld im Bericht | In Reed M23 verwarf `memory: null` am Root den ganzen Bericht. | Drei `fact.asserted` und ein `thread.set` aus Antwort 395. Der Versuch protokolliert `discarded_root: ["memory"]`. Das unvollständige `learn` ohne `how` und das Angebot ohne gültigen Preis bleiben mit ihren eigenen Gründen abgewiesen. |

Bei R1 gilt das bisherige Versuchslimit aus .251. Zwei tatsächlich ungültige Berichte erschöpfen den Schema-Repair. Ein zweiter Transportfehler beendet die Transport-Recovery. Bei zwei leeren Antworten steht wie bisher höchstens ein dritter Versuch zur Verfügung. Permanente Providerfehler und ein Revisionswechsel behalten ihre Abbruchpfade. Ein verwertbarer Bericht mit einzelnen fehlerhaften Deltas ohne offene Spieleraktion benötigt genau einen X-Aufruf. [Runtime](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4b637c981459e1e5ff9f4bd480bc071723fe5bce/avereth-engine/src/v4/runtime.js)

Bei R3 liest die Engine für die Übernahme einen einzelnen, eindeutig zuordenbaren Umschlag. Sie protokolliert die verworfenen **Feldnamen** in den Aufrufdaten des jeweiligen X-Versuchs. Werte aus den Zusatzfeldern erzeugen keine Ereignisse. Zwei konkurrierende Listen, doppelte Schlüssel im zu bereinigenden Bericht, mehrere JSON-Berichte oder ein fehlendes bzw. falsch typisiertes Delta-Array bleiben Fehler. Ein erwarteter Beleg, den X unter seiner Aktionsnummer am Root ablegt, ist eine falsch platzierte Pflichtantwort. Der bestehende Repair benennt die Aktionsnummer und die richtige Form. Ein fehlender angeforderter Beleg behält die bisherige Behandlung offener Aktionen. [Parser](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4b637c981459e1e5ff9f4bd480bc071723fe5bce/avereth-engine/src/v4/extract.js) · [Zahlungsgegenproben](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4b637c981459e1e5ff9f4bd480bc071723fe5bce/avereth-engine/tests/v4/fix185_extractor_repair.test.js)

## Originalantworten und spätere Verträge

Die Gegenproben verwendeten den jeweiligen Chat bis zur gespeicherten Nachricht. Nur deren Extractor-Record wurde neu erzeugt. `processReplyAny` und `runExtraction` verarbeiteten die archivierten Antworten lokal. Für Wolf und Keiler gab es zwei Durchläufe mit demselben Präfix.

| Original | Unveränderte Erstantwort im heutigen Produktpfad | Historischer Replaypfad |
|---|---|---|
| b17-warrior#284 | Der gefrorene Rehkadaver entsteht einmal. Der Wolf erreicht nun die Kreaturenprüfung. Der alte Bericht enthält weder Altersstufe noch Populationsangabe. World lehnt ihn bei der Altersstufe ab. Die von diesem Wolf abhängigen Angaben zu Aufmerksamkeit und Distanz werden ebenfalls abgewiesen. | Die bestehende Vor-.132-Konversion behandelt den Typalias wie das ausgeschriebene `creature.new`. Ein vierter Wolf und ein Kadaver entstehen. Aufmerksamkeit und Distanz beziehen sich auf diesen Wolf. Ein X-Aufruf. |
| b18-warrior#64 | Auch im Keilerbericht fehlen Altersstufe und Population. Die korrekte Typauflösung allein genügt heute nicht zur Erzeugung. | Nach derselben historischen Konversion entsteht genau ein Keiler am erreichten Waldort. Ein X-Aufruf. |
| Reed M23 | .260 meldete nach einem Aufruf `failed`. .261 speichert die verwertbaren Angaben aus der ersten physischen Antwort und schließt nach einem Aufruf ab. | In der getrennten Serie von 67 archivierten Originalfolgen mit passenden Präfixen ist dies der einzige geänderte Ausgang gegenüber .260. In beiden Offline-Serien wurden insgesamt 90 X-Antworten abgerufen. |

Die historische Konversion gehört ausschließlich zum Replaywerkzeug. Sie stellt bei alten Daten das damalige Lesen von Alter, Population und Körperplan nach. Eine aktuelle Modellantwort erhält daraus keine mechanischen Werte. Eine synthetische positive Personenprobe erzeugte Rosa einmal. Eine unvollständige Person erhielt denselben Schemafehler wie unter `person.new`. [Historischer Konverter](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4b637c981459e1e5ff9f4bd480bc071723fe5bce/avereth-engine/tools/replay/contract_c.mjs) · [Originalkorpus](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/4b637c981459e1e5ff9f4bd480bc071723fe5bce/avereth-engine/tests/replay/corpus) · [Reed, archivierte Erstantwort](../testrun_10b/openrouter-20261127-reed-251/raw-395.gz)

### Reed M23 lokal wiederholen

Im Verzeichnis `avereth-engine` des Kandidaten führt dieser Aufruf die physische Erstantwort am Originalpräfix aus. Die Quellen liest er aus dem dokumentierten Git-Stand von `main`.

```sh
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {engineAt} from './tools/replay/replay.mjs';
const base = '010b15809f359b1e4b8b7f624df67e3fbadf8709:testrun_10b/openrouter-20261127-reed-251/';
const read = name => gunzipSync(execFileSync('git', ['show', base + name])).toString();
const chat = read('chat.jsonl.gz').trim().split('\n').map(JSON.parse).slice(1, 24);
const answer = JSON.parse(read('raw-395.gz')).choices[0].message.content;
const {runtime,host,content} = await engineAt(process.cwd());
const id = chat.length - 1;
delete chat[id].extra.avereth;
runtime.processReplyAny(chat,id,content);
let calls = 0;
await runtime.runExtraction(chat,id,content,async () => { calls++; return answer; });
const record = host.rec(chat[id]);
assert.equal(calls,1);
assert.equal(record.extraction.status,'applied');
assert.deepEqual(record.extraction.llm[0].discarded_root,['memory']);
assert.equal(record.events.filter(e=>e.t==='fact.asserted').length,3);
assert.equal(record.events.filter(e=>e.t==='thread.set').length,1);
JS
```

## Abnahme und Übergabe

- Die erste gezielte Serie lief vor der Änderung auf .260. Sieben der 13 Prüfungen zeigten die Fehler, sechs negative Strukturproben bestanden bereits. Der endgültige gezielte Test enthält zusätzlich den positiven Personenfall. [Regressionen](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4b637c981459e1e5ff9f4bd480bc071723fe5bce/avereth-engine/tests/v4/extractor261.test.js)
- Die vollständige Node-Suite umfasst 3.649 bestandene Tests. Der historische Vergleich prüft 2.235 Fälle. Von den 1.392 Abweichungen zur festen .126-Basis stimmen alle mit ihrer einzeln begründeten Ausgabe überein. Gegenüber .260 ändern sich genau vier Fälle. Neben den beiden Tierbegegnungen wird in b17-rogue#192 der gemeldete Lederbeutel gebucht. In b16-rogue-sale#12 wird das zusätzliche Root-Feld `time` verworfen, das Questbriefing gespeichert und der behauptete Gildenfakt weiterhin durch den Kanon abgewiesen. [Vier Einzelbegründungen mit Vorher-/Nachher-Fingerprint](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4b637c981459e1e5ff9f4bd480bc071723fe5bce/avereth-engine/tests/replay/accepted_extractor261.json)
- SillyTavern 1.19 mit Chromium im markierten isolierten Profil, ausschließlich lokaler Mock. Auf dem ersten gesicherten .261-Stand bestanden Party (44/44), Szene (33/33), Handels-HUD (41/41), Speichern (60/60) und Narrator-Streaming (59/59), insgesamt 237 Prüfungen. Das umfasst native Revisionen, Disk-Reload und unterbrochene Antworten.
- Auf dem abschließenden Commit prüft der neue Modus `npm run smoke:st:isolated -- --mode extractor261` den physischen ST-Pfad. Alle 28 Prüfungen bestanden. Ein Bericht mit `creature` und zusätzlichem `memory` erzeugte genau die drei gemeldeten Gegner im gemeinsamen Kampf. Die erste leere Antwort zum folgenden Angriff löste genau einen erfolgreichen X-Repair aus. Die MP-Kosten des Angriffs wurden einmal gebucht. Das Root-Feld ist im gespeicherten Aufrufprotokoll erkennbar. Der separat wiederholte Modus `action_saves` bestand auf diesem Commit ebenfalls alle 60 Prüfungen.

Die Änderungen wurden regulär auf dem bestehenden Entwicklungsbranch gesichert. [Parser, Recovery, Version und Gegenproben](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8e8360b58ebc1d7442a3cd51596245fe4d0bf400) · [Schutz falsch platzierter Pflichtantworten und Replayabnahme](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c66e32055b1ceb755bd798a18f5266b47ab4b58b) · [Isolierte Hostgegenprobe](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4b637c981459e1e5ff9f4bd480bc071723fe5bce)

**Installation nach Freigabe.** Den Extension-Ordner `avereth-engine` aus dem geprüften Entwicklungscommit aktualisieren, SillyTavern neu laden und in der Erweiterungsverwaltung `4.3.0-c.6.6.261` prüfen. Für eine gezielte Aktualisierung ab .260 betreffen die installierten Versions- und Laufzeitdateien `manifest.json`, `package.json`, `src/util.js`, `src/v4/extract.js` und `src/v4/runtime.js`. Zusätzliche Card-, Preset-, Lorebook-, Regex- oder Narrator-Contract-Importe sind nicht erforderlich.

Die Abnahme belegt das technische Verhalten mit archivierten und geskripteten Antworten. Eine neue natürliche Modellabnahme wurde nicht ausgeführt. Providerkosten 0 USD. Die Entscheidung über Usertest 17 folgt auf den unabhängigen GPT-Diffreview.
