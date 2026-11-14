# Build 4.3.0-c.6.6.187 – drei Korrekturen nach dem natürlichen Dreierbatch `.186`

**Basis:** `.186` (`1382491`), Produktbranch-HEAD vorher `24d2aa9` (ST-Sandbox, kein Engine-Build). **Grundlagen** auf `main`: [Opus-Gegenreview](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/npc-20261114-094810Z/GEGENREVIEW_OPUS.md), [GPT-Review §9](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/npc-20261114-094810Z/REVIEW.md), [Architektur-Gegenreview §12.4](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/recherche/ARCHITEKTUR_GEGENREVIEW_10B_OPUS55.md).

**Datengrundlage:** Opus-Auszug der Batch-ZIP: Originalchats, Records, `calls.json` aller drei Läufe und FOCUS-Modellaufrufe. Die Warrior-Requests n162–n170 lagen nicht im Auszug; für sie gelten die gespeicherten Records (`plan.raw`, `outcome`, abgelehnte Deltas) und der GPT-Nachtrag §9. Keine Modellreaktion wurde neu erzeugt.

## Etappe 1 – P1: Arbeit ist kein Kauf (`568d905`)

**Ursache (am Original):** Der Extractor meldete bei Rogue #116 die Arbeit Alarics als Angebot des Küfers („kill the gander on the west road, for the village; the bird's remains stay Alaric's“, `service: other`, 14 cp). Das verstößt gegen seinen eigenen Vertrag. Der Planner nahm das Angebot an (#117), und die Engine buchte −14 cp. Die vorhandene Sperre `work_not_purchase` griff nur bei Wach- und Arbeitswörtern. Die spätere Ablehnung der Auszahlung (`engine_booked`) war regelkonform.

**Korrektur:**
- **Extractorvertrag** (`offer`): Arbeit, die Alaric für andere gegen Bezahlung tut, ist nie ein `offer`, sondern Tatsache, Thread oder Versprechen; `coin.gift` erst bei Übergabe.
- **Engine** (`trade.js paidWorkLine`): Eine Dienstzeile `other` gilt als Arbeit, wenn **beide** Zeichen vorliegen:
  - eine Tat zur Beseitigung einer Gefahr (kill, hunt, clear, cull, drive off, get rid of …),
  - und ihre Richtung: für die Seite des Anbieters („for the village/us“, „bounty“, „reward“, Alaric behält die Beute).
- **Folge bei Arbeit:**
  - Beim Angebot: `work_not_purchase` plus Korrektur für den Erzähler.
  - Bei `offer.accept` eines früher gespeicherten Angebots: abgelehnt, keine Münzen.
- **Tat ohne Richtung** (ein Rattenfänger, der „clear the rats from your cellar“ anbietet): bei der Annahme Rückfrage, außer seine Worte kaufen oder heuern es.

**Tests:** `fix187_paid_work` 6/6, Datei auf `.186` rot.
- Original #116/#117 mit der Extractorzeile aus n175.
- Bereits gespeichertes Angebot.
- `coin.gift` +8 (wie #114).
- Gekaufte Dienste: Bad, Heiler, Führer, Zimmer mit Essen.
- Tat ohne Richtung: Rückfrage; mit „I hire you“: Kauf.
- Tabelle `paidWorkLine`.

Angrenzende Finanz- und Handelstests: 269/269.

## Etappe 2 – P2: Ortsdrift ohne Reise (`a5d02c1`, Nachtrag `92593fd`)

**Ursache, getrennt geprüft (Original-Warrior-Chat #0–#122 als Fixture):**

| # | Befund |
|---|---|
| #117 | Der Planner liefert `move away` von Goblin A (n162). Goblin A stand bereits auf **LONG** (Zustand nachgefoldet). Ein Schritt „weg“ bewegt niemanden, deshalb fiel er in `mapPlan` zur Fiktion: `NOTHING TO BOOK`, A0 `ambiguous_target` wegen der nur bedingt genannten Heavy-Slash-Attacke. Gemeint hatte der Spieler einen Rückzug über den Pfad zum Tor („keep backing up the dark track toward the gate palisade“), also den Weg zurück nach Mossback Warrens. |
| #118, #120 | Der Erzähler lässt ihn trotz `NOTHING TO BOOK`/`STILL HERE` und trotz der Bleibe-Korrektur ankommen. Die Engine weist korrekt ab (`no_go`); die Menschen am Tor fallen unter `scene_context`. |
| #119 | Der Spieler spricht den Torwächter an. Der Planner liefert korrekt `commands: []`; der Erzähler folgt dem Spieler. |
| #121/#122 | Das GO zum neuen „watch-house“ ist autorisiert. Weil die Engine ihn weiter auf der Straße im Reich führt, setzt der Extractor als Eltern-Ort das Reich. Ein Innenraum braucht aber eine Stätte: `place` abgelehnt, **richtig**. |
| #126/#128 | Die Extraktion scheitert an einer leeren Antwort (Längenabbruch). Der Zustandshinweis holt die Erzählung zurück auf den Pfad. |

**Korrektur (eng, vorhandene Mechanik):**
1. **`planner.js mapPlan`:** Ein Schritt zurück außerhalb eines Kampfes, der niemanden bewegt, ist **der Weg zurück** (`retreatGo`, wie schon bei einer Flucht), wenn seine Worte den Weg nennen. Sonst bleibt er Fiktion. `BACK_WAY` kennt jetzt „backing up the track“ und „back slowly up the road“.
   - Ein Schritt, der jemanden bewegt (#113), bleibt ein taktischer Schritt.
   - Im Kampf ändert sich nichts.
   - Ein eigenes GO bleibt das einzige GO.
2. **`world.js`:** Die `no_go`-Korrektur nennt jetzt den Ort, an dem Alaric ist, und den Ort, den er nie erreicht hat („what the last reply had happen to him there did not happen“, „the next reply continues at …“).
   - Nachtrag: Kein „nicht erreicht“, wenn das verweigerte Ziel ein Ort ist, in dem er schon steht (die Stadt um die Halle).

**Unverändert:** Ankunft nur mit GO, `scene_context`, Topologie (ein Innenraum im offenen Reich bleibt abgelehnt), keine Orts-Whitelist, keine Wiederholungsschleife. Ob Modelle die benannte Korrektur befolgen, zeigt nur ein natürlicher Lauf.

**Tests:** `fix187_way_back` 5/5, davon 4 auf `.186` rot.
- #117: Zustand und Plan.
- #117 im Hostpfad: GOES, danach wird die Original-Ankunft aus #118 angenommen; Reload gleich.
- Gegenfälle: #113, ein Schritt ohne Weg, Kampf, eigenes GO.
- #119/#120: Erzählte Ankunft mit Torwache aus den Original-Deltas wird abgelehnt, keine neue Person; die Korrektur nennt beide Orte.
- #121/#122: Der Original-Eltern-Ort wird abgelehnt; nach dem Rückweg ist das Wachhaus unter Mossback Warrens gültig.

Angrenzend: 495/495.

## Etappe 3 – P1f: Abbrüche am Ausgabelimit (`c567e97`)

**Messung** (alle drei `calls.json`, neues Werkzeug `node tools/model_budget_report.mjs <calls.json> …`):

| Aufruf | n | Cap | `length` leer / abgeschnitten | Completion p50 / p95 | Reasoning-Zeichen (p50 normal / p50 bei Abbruch) | Prompt-Tokens p50 (Abbruch / normal) |
|---|---:|---|---|---|---|---|
| Planner, erster Aufruf | 192 | 2000 | 16 / 0 | 105 / 866 | 156 / 8.035 | 13.041 / 13.118 |
| Extractor, erster Aufruf | 213 | 4000 | 44 / 1 | 401 / 2.510 | 403 / 16.262 | 14.810 / 14.636 |

- **Danach:** Der nächste Aufruf derselben Art antwortete in **54 von 60** Fällen. Der Planner fiel nie endgültig aus. Endgültig gescheiterte Extraktionen gab es zwei, beide im Warrior-Lauf:
  - #126: 4000 leer → 4000 leer → 6000 leer.
  - #58: 4000 leer → 4000 leer; die 6000er-Recovery antwortete zwar, aber mit ungültigem `scene`-Ortsverweis (`extract.failed`, Schemafehler, kein Längenabbruch).
- **Aufwand der Abbrüche:** 69 Aufrufe am Limit, 258.768 Completion-Tokens, 3.386 s.
- **Befund:**
  - Die Abbrüche sind ein **Durchlaufen des Reasoning** bis zum Limit, obwohl der Provider `reasoning_effort: low` meldet.
  - Mit der Promptlänge hängen sie nicht zusammen.
  - Normale Antworten sind kurz.

**Varianten:**

| Variante | Bewertung |
|---|---|
| A) höheres Limit (z. B. Planner 3000, Extractor 6000) | **verworfen:** Ein durchlaufendes Reasoning füllt jedes Limit. Die beobachtete 6000er-Recovery antwortete nur in 2 von 3 Fällen, und auch das nach der Anweisung „kurz, sofort“. Mehr Tokens je Abbruch ohne Wirknachweis |
| B) Reasoning begrenzen | **nicht wählbar:** Der Provider meldet `low` und keine Reasoning-Tokens; eine niedrigere Stufe ist hier nicht prüfbar |
| C) gezielte Behandlung der leeren `length`-Antwort im vorhandenen Ablauf | **gewählt:** Beim Extractor gibt es sie schon (Erfolg nach dem ersten Abbruch 35 von 41). Der Planner bekam bisher „your answer was not valid JSON … read the PLAYER MESSAGE again“, obwohl die Antwort leer war. Jetzt bekommt er dieselbe kurze „ran out of room, answer at once“-Anweisung, ohne das leere Assistant-Turn zurückzusenden. Gleiches Limit, gleiche Anzahl Aufrufe, Recovery (4000) unverändert |

Keine Kosten- oder Erfolgsprognose: Die Wirkung kann nur ein natürlicher Lauf zeigen. Das Werkzeug liefert dafür den Vergleich.

**Tests:** `fix187_planner_ran_out` 7/7, Datei auf `.186` rot.
- Leer bei `length` → kurze Anweisung.
- Abgeschnittenes JSON, leer ohne `length` und ungültiges JSON → gewohnte Reparatur.
- Lange gültige Mehrfachhandlung ohne Zusatzaufruf.
- Zweimal leer → Recovery 4000; dreimal leer → Fehler ohne vierten Aufruf.
- Stale Request → keine Wiederholung.
- Hostpfad: einmal gebucht, Regenerate ohne neuen Planner-Aufruf.
- Werkzeugbericht.

Angrenzende Planner-, Extractor- und Recovery-Tests: 282/282.

## Gemeinsame Endabnahme

| Prüfung | Ergebnis |
|---|---|
| Neue Regressionen | 18/18 |
| `npm test` | **3188/3188** |
| Replay gegen `.186` (eigener Baseline-Lauf aus `1382491`) | **2235 Fälle, 19 geändert**, alle feldweise geprüft: nur die `no_go`-Korrektur nennt ihre Orte. P1 und P1f ändern keinen Korpusfall |
| Korpuscheck | `accepted_travel187_vs_126.json`: 1088/1088 mit Fingerprint (8 neu akzeptiert mit ihrer `.186`-Akzeptanz, 11 neu), Schutztest in `replay.test.js` |
| Save/Reload, Fold | in den Host-Regressionen aller drei Etappen; Korpus ohne Fold- und Validierungsfehler |
| ST1.19 Standard/Failsoft | siehe Abschlussbericht; Sandbox-Werkzeug unverändert seit `24d2aa9` |

## Grenzen

- **Natürlich unbewiesen:** ob der Extractor Arbeitsangebote jetzt richtig meldet, ob Erzähler die benannte Ortskorrektur befolgen, ob die kurze Planner-Anweisung leere Antworten seltener macht.
- **`paidWorkLine` ist wortbasiert:** Eine Arbeit ohne Gefahrentat (etwa „carry the sacks to the mill for us“) bleibt dem Vertrag überlassen.
- **Extractor-Recovery:** Eine Antwort nach zwei leeren Versuchen, die dann am Schema scheitert (Warrior #58), wird weiterhin nicht repariert. Das ist unverändert und nicht Teil von P1f.
- **Der Rückweg setzt Worte voraus, die den Weg nennen;** ein bloßes „I back away“ bleibt Fiktion.
- **Die Mage-Unterkunftskette** (`with: null`, Agency-Fehlalarm, Angebot am Eltern-Ort) ist bewusst nicht Teil dieses Builds.
