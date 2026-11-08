# GPT-Kontrollreview – PULSE .166 Zeitzuordnung nach Paket C (08.11.2026)

**Ergebnis: Der mit .165 neu entstandene P2-Unterbuchungsfehler ist mit .166 im nachprüfbaren Codepfad geschlossen. Kein neuer Produkt-Diff-Stopper. Paket C ist aus Sicht dieses gezielten Gegenreviews bereit, als Grundlage von Paket B zu dienen.** Ein natürlicher Spieltest ist für die technische Freigabe von B nach dem vereinbarten Arbeitsablauf keine Voraussetzung. Eine modellseitig **widersprüchliche** Extractor-Antwort bleibt als Beobachtungsgrenze (siehe §4).

## 1. Tatsächlicher Git-Stand, Scope

`.165` [`6df4291`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/6df4291648be819b1f72ddfbd9f1fad21bd2f29c) → `.166` [`8ded6bf`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8ded6bfc4c47c4c465d0b0645f158bdf115f20a1): laut GitHub-Compare **3 Commits vorwärts, 0 zurück**. [Fix `2835589`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/283558979be0aa2536e021a2119e3a0e503ee6d8), [Regressionen `87873fa`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/87873fa339036a4ef361aab27b7f2afceb66bd0c), final [`8ded6bf`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8ded6bfc4c47c4c465d0b0645f158bdf115f20a1).

Runtime geändert: **nur `src/v4/world.js`**, enger Abgleich von `pauseCut`, `cutAway`, `besideCut` und `expected[seq].minutes`. Zusätzlich sechs Regressionen in `tests/v4/pulse_c166.test.js`, Buildmetadaten und eine [eigene Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/8ded6bfc4c47c4c465d0b0645f158bdf115f20a1/avereth-engine/docs/PULSE166_REST_TIME_ATTRIBUTION.md). Keine Änderung an PULSE-Wahrscheinlichkeiten, Unterbrechungszeitpunkten, RNG, Erholung, NPCs, Dungeon, UI oder zeitlichem Eventreducer.

**Nachweisgrenze:** Dieser GPT-Abgleich hat den tatsächlichen Git-Diff, `world.js`, `extract.js`-Schema, `content/deltas.json` und die neuen Tests geprüft sowie die neue Buchungsarithmetik unabhängig in JavaScript für sechs Hauptfälle nachgerechnet. **Keine Node-/ST-/Replay-Runtime-Läufe durch GPT neu ausgeführt.** Vollsuite und Hostzahlen im nächsten Abschnitt stammen von Claudes Implementiererabnahme.

## 2. P2-Fix fachlich und rechnerisch geprüft

Bisher `.165`: `cutLeft = of_min - after_min` wurde von allen zusätzlichen Extractor-Minuten abgezogen, auch wenn diese **tatsächlich eine unabhängige Handlung** betrafen. Eine Mahlzeit von 60 min plus auf 35 min verkürzter Schlaf führte bei korrekter Erzählung und `time:95` nur zu 35 min Buchung.

`.166`:

- Hat vor der Rast **keine andere gebuchte/autorisierte Aktivität stattgefunden**, bleibt der volle `cutAway`-Schutz; dadurch bucht eine reine 480-min-Rast mit Cut 35 trotz Extractor `time:480` nur 35 min.
- Gab es vor der Rast eine andere tatsächlich im Spielerrecord aufgelöste Handlung, wird die abgeschnittene Zeit mit der **schon bestehenden Pflichtangabe des Extractors `expected[<pause.seq>].minutes`** bestimmt: `min(of-after, max(0, expectedPauseMinutes-after))`. `EXPECTED_SHAPES.activity` in `extract.js` verlangt `{minutes:int≥0,done:boolean}`, `content/deltas.json` bezeichnet `time` als `story time that passed`. Es gibt daher keine neue Schemainformation oder zweiten Modellaufruf.
- Bei fehlender/ungültiger Rastangabe bleibt der konservative alte Cut-Schutz.
- `booked_min`, `timeCap`, ursprüngliche Eventfolge und die Buchung der Erholung **nur für tatsächlich geruhte Minuten** bleiben unverändert.

**Unabhängiger arithmetischer Gegencheck** mit `m=35`, `of=480`, `timeCap=120` (für einen bestehenden tatsächlichen Spielerzug liegen die jeweiligen Werte/der Seed im Runtimezustand):

| Fall | Extractor | Ergebnis .166 | Soll |
|---|---|---:|---:|
| 60 min Kochen, 35 min Schlaf tatsächlich erzählt | `time:95`, `expected.sleep.minutes:35` | **95** | 95 |
| Dieselbe Antwort mit getrennten `time`-Deltas | `time:60` und `time:35`, `expected.sleep.minutes:35` | **95** | 95 |
| Extractor meldet nur 60 Gesamtminuten | `time:60`, `expected.sleep.minutes:35` | **60** | 60 nach bisheriger globaler Zeitsemantik |
| Kochen 60 min plus widersprüchlich ganze 480-min-Nacht | `time:540`, `expected.sleep.minutes:480` | **95** | 95 |
| Reine Rast trotz Cut vollständig gemeldet | `time:480`, `expected.sleep.minutes:35` | **35** | 35 |
| Reine 30-min-Rast mit Cut bei 15, aber 30 gemeldet | `time:30` | **15** | 15 |

Die neue Testdatei `pulse_c166.test.js` deckt diese Richtungen über `say()` + `g.reply()` und für den Cut relevante `expected`-Werte einschließlich Reload/Fold ab. Die bedingte Abzweigung ist eng und ersetzt die vorherige pauschale Cut-Subtraktion. Der P2-Fall aus [GPT-Review .165](REVIEW_PULSE165_PRODUKTDIFF_GPT.md) ist damit geschlossen.

## 3. Regressionen und dokumentierte Abnahme

Claudes berichtete Endabnahme: Neue Regressionen **6/6** (auf unverändertem .165 drei rote echte Ausgangsfälle), angrenzende PULSE-Tests **52/52**, vollständiges `npm test` **2896/2896**, Replay **2235** Fälle, **1040/1040** exakt akzeptiert, **0 offen/veraltet**, echter ST1.19-Host **97/97 Standard**, **102/102 Failsoft**, je **0 PageErrors**. Im Host wurde der gemischte Fall nicht eigens geskriptet; die End-to-End-Nodefälle laufen über die reale Engine-/Extractor-Verarbeitung, aber die Providerantworten sind kontrolliert. Freie Modellbefolgung noch nicht gemessen.

**Unabhängiger Git-Blobs-Abgleich:** `tests/replay/accepted_pulse164_vs_126.json` ist zwischen .165 und .166 *identisch* (SHA `3a6f55cb3c60d02b23cbbc827391559327076867`). Damit wurden keine Replay-Akzeptanzeinträge still umgeschrieben oder neu eingeführt. Der Dateiabgleich ist kein eigenständiger kompletter 2235-Fälle-Replaylauf.

## 4. Verbleibende enge Beobachtungsgrenze, kein weiterer Pflichtbuild

Die `.166`-Erweiterung verlässt sich im gemischten Fall auf `expected[seq].minutes` **aus derselben Extractorantwort**. Das Feld ist zwar im Schema erforderlich, aber kein separat gemessener Zeitbeweis. **Widerspricht eine Extractorantwort sich selbst** (z. B. `expected.sleep.minutes=35` und gleichzeitig `time:480` bei einer angeblich voll durchgeschlafenen Nacht plus eigentlich zeitloser Vorhandlung), kann die generelle Zeitkappe weiterhin einen zusätzlichen Zeitabschnitt verbuchen. Das ist kein neuer bestätigter Fehler bei **einer in sich konsistenten, dem Vertrag entsprechenden Antwort**, sondern eine verbleibende Kreuzfeld-Validierungsgrenze des bisherigen Modells.

Eine harte Lösung für jede widersprüchliche Modellantwort müsste den ungebuchten unabhängigen Zeitanteil gesondert beweisen. Das übersteigt den eng freigegebenen C-Fix und sollte **nicht als weitere sofortige Patchschleife** ohne natürlichen/konkreten Fehlerfall begonnen werden. Die bekannte .164-P3-Unterkunfts-Wortheuristik bleibt ebenfalls ein Beobachtungspunkt.

## 5. Entscheidung / Übergang zu Paket B

**Gezielter Produktreview .166 abgeschlossen: kein P2-Stopper offen.** Der Nutzer wollte die zuvor separat formulierten Pakete C und B **nacheinander** implementieren; C ist nun technisch implementiert, der Nachfix kontrolliert. **B kann auf dem aktuellen Produkt-HEAD (bei diesem Review .166 / `8ded6bf`) nach dem bereits formulierten eigenen Auftrag beginnen.**

Bei Paket B als Pflichtintegrationsfall die unveränderte Time-/Cut-Logik auch mit **Dungeon-Rast, Wander-Slot, `rest + GO` und korrekt gemeldeten Extractorzeiten** testen; der C-Stand wird dafür nicht nochmals umgebaut. Natural-Run und PULSE-Parameterfeinschliff bleiben bis nach B getrennt.
