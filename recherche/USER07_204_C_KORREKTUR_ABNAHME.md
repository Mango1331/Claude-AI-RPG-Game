# User07 auf .204 · Technische Abnahme der C-Korrektur

**Der Aushang bleibt nach der bestätigten Rückkehr in Ashbridge. Der Kupfertopf erhält beim ersten Blick ins Goblinlager eine Boden-ID. TAKE und Wiederbesuch erhalten diese ID.** Der Kandidat ist bereit für den unabhängigen Diffreview. Die persönliche Fortsetzung entscheidet der Nutzer anschließend. [Natürlicher Ausgangstest](../testrun_10b/user07-camp-openrouter-20261122/README.md) · [GPT-Gegenreview](../testrun_10b/user07-camp-openrouter-20261122/REVIEW_GPT.md)

Abnahme vom 22. November 2026 auf `experiment/204-user07-board-dungeon-camp`. Elterncommit `4ff1500e4929c0604803a19d31fb6b52b348f209`, Korrekturcommit `52d9c04aaf9f32ae92f03a72e9686d4b662749c6`. Die Laufzeitänderung betrifft `src/v4/camp.js`, `src/v4/world.js` und `src/v4/commands.js` unter `avereth-engine/`.

## R1 · Welcher Ort trägt den Fund?

Die Inspektion galt zuvor für alle Bodenmeldungen des Zugs. Der reguläre Objektpfad öffnet sich jetzt nach einer tatsächlich verarbeiteten freiwilligen Ankunft an einem separaten GO-Ziel. Der Holder muss am erreichten Ort liegen und der Bericht muss ihn durch Ortshalter oder Szenenreferenz dort verankern. Auf einer Anhöhe muss die Prosa den gemeldeten Gegenstand selbst ausdrücklich beim Beobachter verorten. [Kontrollierte Eingaben, Prosa und Extractorberichte](../testrun_10b/user07-camp-openrouter-20261122/gegenprobe.json)

| Fall | Auf `4ff1500` erneut beobachtet | Mit Korrektur |
|---|---|---|
| `mixed` | Aushang nach GO verworfen | Ein Aushang am Holder Ashbridge |
| `actual-planner` | Gleicher Verlust mit dem echten Planner von Zug 6 | Ein Aushang in Ashbridge. Ankunftsprosa und Fund sind kontrollierte Vorgaben. |
| `lookout` | Vermessungsmarke neben Alaric verworfen | Eine Marke auf der Anhöhe, ohne Campbestand |
| `remote` | Schale unten im Lager aus der Ferne unerreichbar | Keine Schale auf der Anhöhe. Nachfolgendes TAKE verweigert. |
| `travel-control` | Aushang in Ashbridge | Gleicher Holder und gleiche Stückzahl |

Die unbestätigte Reise und eine örtlich uneindeutige Meldung ergeben ebenfalls keinen Aushang. Ein verworfener Swipe entfernt die Vermessungsmarke. Regenerate verwendet die bereits gebuchte Eingabe und legt die Marke in der passenden Antwort genau einmal an.

## R2 · Was wurde gesehen, was genommen?

Die unveränderten physischen Antworten zu den natürlichen Zügen 2–4 liefen offline durch Parser und Weltanwendung. „A cooking pot of dented copper, worth little but real“ ist die Beschreibung in der Prosa. „dented copper cooking pot“ lautet der Name im reparierten Extractorbericht. Zuvor scheiterte die Buchung an der Wortreihenfolge und am fehlenden Besitzfreiheitshinweis im selben Satz. Jetzt können die Namenswörter innerhalb einer zusammenhängenden Objektbeschreibung anders angeordnet sein. Bei einem örtlich belegten, verlassenen und zugänglichen Lager genügt für gewöhnliches Gebrauchsgut eine direkte Sichtbeschreibung. Hinweise auf Eigentum, Wert, Verschluss oder Verbergung begrenzen die Buchung. [Archivierte Modellantworten 4–14](../testrun_10b/user07-camp-openrouter-20261122/provider.jsonl.gz)

| Zug | Nachgespielter Weltstand |
|---|---|
| 2 · Erster Blick | Genau `obj.t44.dented_copper_cooking_pot` am Boden von `loc.rise_above_the_goblin_camp.goblin_camp`. Speer und verschnürtes Bündel bleiben abgewiesen. |
| 3 · Ausdrückliches TAKE | „dented cooking pot“ löst auf die bestehende ID auf. Die originale Extractorantwort meldet nochmals Neuanlage und Transfer. Die Eingabebuchung belegt die Mitnahme bereits. Die ursprüngliche ID liegt einmal beim PC, am Boden liegt keine Topfkopie. |
| 4 · Wiederbesuch | Dieselbe ID bleibt beim PC. Die neuen Meldungen erzeugen keinen zweiten Campbestand. |

**Warum beim Wiederbesuch `camp.free=false` gilt.** Der gespeicherte Vorzustand enthält als einziges aktives Hindernis oder Gefahrenmerkmal am Ort `gathering storm` vom Typ `hazard`. Alaric ist allein, die Liste ausstehender Kämpfe ist leer. Entfernt der Test ausschließlich den Sturm aus einer gefalteten Arbeitsspeicherkopie, wechselt `free` auf `true`. Die bestehende Gefahrenregel kann damit bei einem aktiven Wettermerkmal eine neue Bestandserfassung sperren. Die zuvor angelegte Boden-ID bleibt bei zulässigem Zugriff mitnehmbar. [Archivierte Reload-Welten](../testrun_10b/user07-camp-openrouter-20261122/reload-welten.json.gz)

## Prüfungen

| Prüfung | Ergebnis |
|---|---|
| Rotlauf auf dem Elterncommit | 2/6 Kernprüfungen bestanden. Vier rote Fälle waren `mixed`, `lookout`, `actual-planner` und die erste Topfsichtung. |
| Archiv- und Kontrolltest auf dem Korrekturstand | 9/9 bestanden, einschließlich der Originalfolge mit beiden strukturellen Repairs, Ortsnegativen, Sturm-Gegenprobe und verworfener Antwortrevision. |
| Gezielte Node-Prüfungen | 32/32 zu Camp und Weltjobs bestanden. Zusätzlich bestanden die historischen I17/I21/I22/I31-Prüfungen mit beiden Plannerpfaden. Die Gegenfälle umfassen Fremdbesitz, wertvolle Ausrüstung, Fernsicht, abgetrennte Namensbestandteile, verborgene Suche mit PER, Verbrauch und erneutes Umschauen. |
| Vollständiges `npm test` | 3.425 bestanden, 0 fehlgeschlagen, 0 übersprungen. |
| `npm run replay:check` | 2.235 Vergleiche. Alle 1.131 bereits genehmigten Abweichungen zur alten .126-Baseline trafen ihren exakten Fingerabdruck. 0 neue Abweichungen. |
| Isoliertes ST 1.19.0, Modus `user07_camp` | 32/32 bestanden, 0 Browserfehler. Erster Blick, ausdrückliches TAKE und Wiederbesuch liefen jeweils mit einem lokalen Planner-, Narrator- und Extractorrequest. Jeder dieser drei Weltjobs meldete bestätigten Save mit Read-back vor der Eingabefreigabe. Der Reload nach jedem Zug ergab dieselbe geprüfte Sicht auf Ort, Bestand, Objekt-ID, Holder, Menge, Geld, Quests und Extraktionsstatus. Der Swipe-Test des Runners bestand ebenfalls. |

[Technischer Diff mit Tests und Mock](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/52d9c04aaf9f32ae92f03a72e9686d4b662749c6)

Die beiden ursprünglichen Extractor-Reparaturen wurden im Archivtest mit den tatsächlichen Antworten abgespielt. Der Browsertest verwendete einen lokalen Mock. Für diese Abnahme wurden 0 kostenpflichtige Modellanfragen versendet. Wie häufig weitere natürliche Formulierungen erkannt oder vorsichtshalber abgewiesen werden, bleibt offen.

### Reproduktion

Im Engineverzeichnis des technischen Commits ausführen. `RUNS` verweist auf `testrun_10b/` eines getrennten `main`-Checkouts. Die markierte ST-Sandbox enthält SillyTavern 1.19.0 bei `7e8663cd9c184a550b37238218bdd32c6efc68e9`.

```sh
node tools/user07_camp_openrouter_check.mjs "$RUNS/user07-camp-openrouter-20261122"
node tools/user07_camp_check.mjs "$RUNS/user-20261121-171341-204"
node --test tests/v4/user07_camp.test.js tests/v4/patch10b4c2_world_jobs.test.js
npm test
npm run replay:check
node tools/st_live/isolated.mjs --mode user07_camp
```
