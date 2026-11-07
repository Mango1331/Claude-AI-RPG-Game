# GPT – unabhängiger Abschlussabgleich der PULSE-Produktcommits .162 → .163 (07.11.2026)

**Urteil:** **Kein neuer kritischer Produkt-Diff-Stopper** für einen **natürlichen PULSE-Test auf .163**. Claudes Paket A hat Sols .161-QoL als direkten Vorfahren, und Sols beide in .162 reproduzierten Integrationslücken **R1 und R2** wurden in .163 gezielt korrigiert. Der verbleibende **P3-Restfall bei gemischten/mehreren Vertragszielen** ist konkret belegbar, bleibt aber eine schmale Erzählertext-Projektion; für den beabsichtigten populationsbasierten Jagdtest kein zwingender Zwischenpatch.

Dieser Abgleich ist ein **eigenständiger Git-/Code-/Replay-Metadaten-Review**, **keine** erneute vollständige Node-/Replay-/ST-Abnahme. Die Testsummen stammen aus den Implementiererpatchnotes und Sols unabhängig ausgeführtem Nachreview. Keine Produktdatei wird durch dieses Review geändert.

## 1. Tatsächliche Git-Folge und getrennte Zuständigkeiten

**Produktbranch** `claude/c-planner-prototype-2026-10-02-gpt-c666`:

1. `.161` [`bd19a30`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/bd19a30fb60c0c05ea9ecf077dc25b1cb4094088): Sols UI-/Intent-QoL.
2. `.162` [`1f8a570`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/1f8a570c7e51f11bda810f4cb4bf620772bcf412) Core, [`aa4150c`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/aa4150cf087ca9c2c533d573171f0da0790525a9) Firewall/Diagnose, [`b160757`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b160757f68141991db3e91255e11246af7ead122) Tests/Replay, [`0b45c28`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0b45c28fb064bde3ad7dd41401b932e7901f2142) ST-Smoke/Build: Claude implementiert **nur Paket A**.
3. Sols unabhängiger Review auf `main`: [`8f0d596`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8f0d596b7d572c02f7cb7a3953795d48c55d949e), [`REVIEW_PULSE162_PRODUKTDIFF_SOL.md`](REVIEW_PULSE162_PRODUKTDIFF_SOL.md): zwei tatsächlich reproduzierte P2-Lücken.
4. `.163`: [`3f99f7c`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/3f99f7c940d920a1ec9276a15e285a6abe2cb905) enger R1/R2-Produktfix; [`7523405`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/75234059712bb587ab823ee1cc1c9e005ce78f8c) Regressionen/Replay; [`6339f81`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/6339f81a66c2c9af727e760bde3c391234020049) ST-Probe/Patchnote/Build. Sols [gezielter Nachreview §6](REVIEW_PULSE162_PRODUKTDIFF_SOL.md#6-gegenreview-163) bestätigt die R1/R2-Korrekturen und dokumentiert P3.

Die GitHub-Vergleichsabfrage bestätigt: `.161 → .163` **7 Produktcommits vorwärts, 0 zurück**, Merge-Base exakt `bd19a30`. `.162 → .163` **3 Commits vorwärts, 0 zurück**. Kein divergierender paralleler Produktbranch und kein Merge zurück auf `.160`. Das verhindert, dass Sols .161-QoL versehentlich verloren ging. Die `.163`-Produktänderungen gegenüber `.162` sind auf `pulse.js`, `envelope.js`, Tests, Replay, ST-Werkzeug, Version und Patchnote begrenzt. Kein weiterer Combat-, Item-, Dungeon-, Quest- oder UI-Mechanikeingriff in .163.

## 2. Eigene Codeprüfung – R1 und R2

**R1 – Widersprüchlicher Erzählervertrag korrigiert:** `envelope.js:envelopeLines()` ergänzt über `soughtException()` die aus `auth.pulse.sought/hunts` tatsächlich vorhandene Ausnahme direkt neben der sonst geltenden Neuankömmling-Regel. Soweit der Zustand es hergibt, nennt sie Population, Habitat und – bei Reise zum Habitat – den ausdrücklichen Vorbehalt „erst nach tatsächlicher Ankunft“. Für alle anderen neuen Angreifer und für Wegnahme bleibt die Schranke unverändert. Der eigentliche `world.js:envelopeAllows()`-Zielabgleich über `soughtMatch()` und den **tatsächlichen Ereignisort** blieb unverändert; keine zweite Berechtigungsquelle. Die sechs neuen Tests prüfen u. a. echte `buildContext()`-Ausgabe und erlaubte Reaktion sowie abgewiesene Fremde. Sols ST-Abnahme belegt die Ausnahme im tatsächlich ausgehenden Hostrequest.

**R2 – Teilstring/Adjektiv als Suchberechtigung beseitigt:** `pulse.js:focusNames()` vergleicht nach `kindOf(…, {species:true})` und `sameKinds` nur **ganze normalisierte Artwörter/Kopfnomina**. Der bisherige rohe Teilstring-Match und ein beliebiges gemeinsames Vertragsadjektiv sind nicht mehr autorisierend. Die Tests enthalten positive `boar tracks`, `boars`, `snapping turtle`, `hound` sowie negative `broken boards`, `boardwalk`, `wild herbs`, `the wild`; zusätzlich einen echten Suchhandler-zu-World-Ablehnungsfall. `namesKind()` bleibt weiterhin als bereits vorhandene Vergleichsregel für neu erzeugte, tatsächlich beschriebene Kreaturen in `soughtMatch()`; keine neue Spawnmechanik.

**Umfang der Basiserfüllung:** `pulse.js:pulseFinish()` besitzt einen einzigen, seed-/turn-basierten Wurf nach den Handlern; `domain.js` hält Fehlwurfserie/Pausenblock im Event-Fold, `world.js` prüft das eine feindliche Fenster und verbietet neue Wegnahmen, `turn.js` trägt `auth.pulse` in den gespeicherten Outcome. Keine Zusage, dass jeder offene Wurf vom freien Narrator ausgeführt wird; `pulse.outcome.narrated` ist ausdrücklich eine Heuristik. Dungeon-Gefahren/Rastunterbrechung bleiben C/B, nicht A.

## 3. Replayakzeptanzen – separat von Testbehauptungen geprüft

Direkt beide Akzeptanzdateien als vollständige JSON-Objekte gelesen und verglichen:

| Übergang | Alte vorhandene Einträge identisch | Alte Einträge mit neuem Fingerprint | Neu hinzugekommen | Gesamt |
|---|---:|---:|---:|---:|
| `.161 → .162` | **351** | **166** | **523** | **1040** |
| `.162 → .163` | **1034** | **6** | **0** | **1040** |

Keine alten IDs gelöscht; alle **166** veränderten bisherigen `.161`-Akzeptanzobjekte sind bei .162 als `previous_acceptance_160` **strukturell exakt erhalten**; alle **sechs** veränderten .162-Objekte bei .163 als `previous_acceptance_162` **strukturell exakt erhalten**. Die sechs IDs: `b18-rogue#65`, `#71`, `#209`, `#243`, `#291`, `#295`, alle `category:'pulse163 sought'`. Dies ist eine **unabhängige Metadatenvergleichsprüfung** – sie reproduziert **nicht** selbst jeden der 2235 Runtime-Replayfälle oder die behauptete Gleichheit der übrigen 1034 vollen Recordinhalte. Sols §6 belegt seine weitergehende **gezielte zwölfmalige Original-Rekonstruktion** mit den zwei Produktständen.

Testmeldungen nach Claudes Abnahme und Sols gezielter Nachkontrolle, nicht selbst neu ausgeführt: .163 **6/6 neue Regressionen**, **2866/2866 Node**, **2235 Replayfälle / 1040 akzeptiert / 0 offen/veraltet**, **ST1.19 78/78 Standard + 83/83 Failsoft**, jeweils **0 PageErrors**; Sol **29/29** gezielte PULSE-Tests und die beschriebenen Originalvergleiche. Für die natürlichen Modellaufrufe bestehen noch keine Nachweise.

## 4. Verbleibender P3-Fall – fachlich real, aber kein A-Test-Stopper

**Befund aus Sols §6.3, unabhängig am heutigen Code bestätigt:** `envelope.js:soughtException()` wählt im `x.contract`-Zweig schlicht **das erste Objective mit `what`**, ohne `KILL`-/`DEFEAT`-Filter. `pulse.js:searchSought()` registriert den Vertrag hingegen nur über einen **erfolgreich gesuchten Kampfzieltyp**, und `soughtMatch()` autorisiert dessen zutreffende Kreatur. Für einen gemischten Vertrag `DELIVER medicine` vor `DEFEAT wild boar` könnte die Envelope-Zeile fälschlich die Medizin als „darf auftauchen und angreifen“ nennen. Bei mehreren unterschiedlichen Kampfzielarten kann die Projektion unvollständig sein. Es ist eine **widersprüchliche sprachliche Projektion**, kein im Diff belegtes neues Zugriffsrecht auf Loot/Geld/Questfortschritt.

**Einordnung:** Für den konkret vorgesehenen ersten PULSE-Test mit **Populationsjagden** nutzt die Envelope andere Zweige, deren R1/R2-Fälle geprüft sind. Daher **P3, kein zusätzlicher Pflicht-Hotfix vor dem natürlichen Test**. Bei nächstem passenden kleinem Patch oder bevor gemischte Mehrziel-Kampfaufträge gezielt getestet werden: aus genau den autorisierten Kampfzielobjektiven die Erzählerziele darstellen; nicht aus `objectives[0]` und keine neue Autorisierung. Als gesonderte Regression eine Lieferung vor Kampfziel und zwei verschiedene Kampfzielarten aufnehmen.

## 5. Entscheidung und nächster sinnvoller Nachweis

**Empfehlung: Freier natürlicher User-Test auf `.163`, keine weitere allgemeine Code- oder Batchreview-Schleife.** Beim Spielen unverkrampft beobachten:

- Tritt ein tatsächlich geöffnetes PULSE-Fenster als **konkrete Handlungssituation** auf, und stimmt seine Art mit dem offiziellen Ereignis überein?
- Sind Reise-Stopps klar, bleibt ein ruhiger Abschnitt frei von neuem Angriff, und erlauben gesuchte Kreaturen bei bestätigter Ankunft normale Begegnungen?
- Passt die Häufigkeit trotz Fehlwurfserie und Tageszeit zur gewünschten Lebendigkeit, oder entsteht störende Häufung?
- Bleiben die `.161`-QoL-Entwürfe, HUDs und kleinen Intentkorrekturen beim Spielen funktionsfähig?

Nach dem Run mit Original-JSONL, Events, ST-Log und spontanem Feedback die tatsächliche PULSE-Erzählumsetzung analysieren. Erst anschließend Parameterentscheidung Paket D und ggf. gesonderte Freigabe der Pakete C/B. Keine automatische Produkterweiterung durch dieses Review.

**Produktstand:** `.163` / `6339f81`. Dieser Review liegt ausschließlich auf `main`; keine Test-/Implementierungsergebnisse erfunden.
