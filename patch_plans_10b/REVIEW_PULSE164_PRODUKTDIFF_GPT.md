# GPT – unabhängiger Produktdiff-Gegenreview .164 (PULSE Paket C, 08.11.2026)

**Vergleich:** Produkt `.163` [`6339f81`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/6339f81a66c2c9af727e760bde3c391234020049) → `.164` [`a6aa3be`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/a6aa3beb3b3349909fc4584636e904908924c3f2). Commitfolge: [`f847c7d` Implementierung](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/f847c7d21b1f000ca858ac3e874acb90e0b0a5ad), [`cad656f` Tests/Replay](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/cad656f84f7f1c77b25ce3cc586a7eb6c129f266), `a6aa3be` Smoke/Build/Dokumentation. Der Vergleich ist **drei Commits vorwärts, null zurück**, Basis ist exakt `.163`.

**Ergebnis:** Paket C ist **weitgehend planentsprechend implementiert**, aber **ein P2-Buchungsfehler im Extraktor-Zeitpfad muss vor Paket B eng korrigiert werden**. Der bisherige ST-Smoke erfasst die Gegenprobe nicht. Kein allgemeiner Architekturreview, keine Balanceanpassung und kein Reset des Produktstands erforderlich.

**Prüfgrenze:** GitHub-Diff, tatsächliche Runtimefunktionen, Regressionen/Smokefälle, beide vollständigen Replayakzeptanz-JSONs wurden gelesen und strukturell verglichen. **GPT hat keine Node-, echten ST-/Host- oder Runtime-Replaytests selbst ausgeführt**, da über den GitHub-Connector nur die Quellen und Git-Artefakte vorliegen. Die unten erläuterte P2-Lücke folgt direkt aus der nachlesbaren Buchungsarithmetik und muss durch eine **neue ausführbare End-to-End-Gegenprobe** reproduziert und geschlossen werden. Die Summen aus Claudes Patchnote sind Implementiererabnahme, nicht eigene Testresultate.

## 1. Positive Codebefunde

- **C1/Wurf:** `commands.js:activity` ruft `pulseClaimPause` vor `time.advanced`/`recoveryEvents`; `pulse.js:settle` benutzt den bestehenden Seed-/Turn-Schlüssel und `pulseFinish` übernimmt `P.claim`, ohne neu zu würfeln. `pulse.rolled` wird bei einer frühen Entscheidung einmal vor Zeit/Erholung emittiert. `P.reason`, `held`, Pausenblock und legitime GO-vor-Rast-Sperre bleiben erhalten.
- **C2/Regeneration:** Bei `m >= 30` ist `after = 15 + hash(seed|turn|pulse.at) % (M-29)`, bei kürzeren Pausen `at_end`. Die Engine bucht selbst `time.advanced(booked)` und `recoveryEvents(booked)`; die Maximal- und Mindestwerte sind plausibel.
- **C3/Sicherheit:** `pauseSafety` trennt sicher, Stadtstraße und exponiert; die drei Gruppen unterscheiden unterbrechende und nur beobachtete Arten. Kein Dungeon-Rast-PULSE in .164, wie ausdrücklich vorgesehen. Der zusätzliche Wildnis-Gebäudeschutz verhindert konkret beobachtete falsche Unterbrechungen in einer Mühle und Herdstube; er ist aber eine breite Heuristik (siehe P3).
- **C4/Befehle:** `rest interrupted` wird in der `resolveCommands`-Schleife **vor den Handlern** und vor dem Kauf-/Zahlungsfortschritt entschieden. `needs`-Abhängigkeiten fallen mit, keine Rückbuchung für spätere Handlungen nötig; auch kurze Pausen blockieren.
- **C5/Ursache:** Die Eventursache wird zeitlich fest mitgeführt, eine Faktzeile für den Folgezug aus dem gespeicherten Record abgeleitet; bei fehlendem Figuren-Anlass erzeugt `world.js` die dokumentierte gezielte Korrektur, keine zusätzliche Kampf- oder Figurenbuchung. Das ist ausdrücklich heuristisch und kein Beleg natürlicher Modellbefolgung.

## 2. **P2 / Vor Paket B korrigieren: Zeitkappe erlaubt nach unterbrochener Rast zusätzliche Narrator-Minuten**

**Quellpfad:**
- [`commands.js:73`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a6aa3beb3b3349909fc4584636e904908924c3f2/avereth-engine/src/v4/commands.js#L73) startet `ctx.auth.timeCap` mit `content.rules.time.default_cap_min = 120`.
- [`commands.js:759–787`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a6aa3beb3b3349909fc4584636e904908924c3f2/avereth-engine/src/v4/commands.js#L759-L787) berechnet bei einem echten vorzeitigen Cut `cap = ceil(cut.after_min * minutes_factor)`, `minutes_factor = 1.25`, und setzt dann **`timeCap = max(timeCap, cap)`**, anschließend `booked_min = cut.after_min`.
- [`world.js:362–368`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a6aa3beb3b3349909fc4584636e904908924c3f2/avereth-engine/src/v4/world.js#L362-L368) verwendet `cap = auth.timeCap`, `bookedLeft = booked`, `timeUsed = booked`.
- [`world.js:966–975`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a6aa3beb3b3349909fc4584636e904908924c3f2/avereth-engine/src/v4/world.js#L966-L975) behandelt akzeptierte Extractor-`time`-Deltas: `covered = min(bookedLeft, d.minutes)`, `want = d.minutes - covered`, `room = max(0, cap - timeUsed)`, `m = min(want, room)`, dann **`time.advanced(m)`**. Kein besonderer Guard für `auth.pulse.interrupt`.

Damit kann **genau die Restzeit einer mechanisch abgebrochenen Pause** nachträglich noch gebucht werden, wenn der Extractor die ursprünglich geplante volle Rastzeit meldet. Zwei konkrete Arithmetik-Gegenbeispiele:

1. **Geplante 30-min-Rast; Cut bei 15 min.** `auth.booked_min=15`; `auth.timeCap=max(120,ceil(15*1.25))=120`. Extractor meldet `{type:'time',minutes:30}`: `covered=15`, `want=15`, `room=105`, **weitere 15 Minuten werden gebucht** → 30 statt 15.
2. **Geplante 480-min-Rast; Cut bei 397 min** (Claudes ST-Hauptfall). `timeCap=max(120,ceil(397*1.25))=497`; Extractor-`time` 480 → `covered=397`, `want=83`, `room=100`, **weitere 83 Minuten werden gebucht** → volle 480 statt 397.

Die zusätzliche Buchung fällt nicht schon durch `timeCap` aus; die dokumentierte Aussage, die Kappe schütze die abgeschnittene Restzeit, ist also **nicht allgemein richtig**. Die Antwort darf einen Fehler machen, aber die Engine muss den Cut als autoritative Wahrheit verteidigen. Die bisherigen `pulse164_smoke.mjs`-Providerantworten liefern `deltas:[]` bzw. neue Person/Hostile **ohne `time`-Delta**, sodass selbst grüne 96/101-Checks diesen Gegenfall nicht prüfen.

**Abnahme-/Fixvorgabe, bewusst keine vorschnelle breite Lösung:** Ein `time`-Delta, das die bereits gebuchte **unterbrochene Pause** noch über deren `interrupt.after_min` hinaus erweitert, muss als Duplikat/Übergriff behandelt und darf nicht nachgebucht werden. Nicht nur `timeCap` verringern, ohne zu prüfen, ob **vor** der Rast eine andere unabhängige, legitime Handlung mit eigener Zeitberechtigung ausgeführt wurde: `timeCap` ist eine allgemeine Turn-Kappe und `booked_min` akkumuliert unterschiedliche Schritte. Die Autoritätsgrenze muss die **konkrete Pausenzeit** schützen, ohne andere zuvor autorisierte Aktivitäten zu unterdrücken.

Pflicht-Gegenproben mit tatsächlichem `playerTurnV4`/Extraktor-`applyWorld`- oder `replyTurnV4`-Pfad (nicht nur `resolveCommands`):
- 30 → 15 und Extractor meldet 30: **zusammen weiterhin exakt 15 Minuten**; Erholung exakt für 15.
- 480 → 397 und Extractor meldet 480: **zusammen exakt 397**, keine Restbuchung.
- `at_end` bei 5/20 Minuten mit entsprechendem `time`-Delta: keine Doppelbuchung.
- Eine früher im selben Turn wirklich autorisierte unabhängige Handlung mit Zeit und danach unterbrochene Rast: deren **berechtigte** Zeit bleibt erhalten, nur die fehlende Rastzeit wird nicht nachgeholt.
- Extraktor meldet `time` neben `person.new`/`hostile` nach dem Cut: Ursache/Kampf unverändert, **keine** zusätzlichen Pausenminuten.
- Replay/Save/Reload/Swipe/Fold nach Korrektur gleich.

**Einstufung P2, begrenzter Produkt-Stopper vor B**, kein Grund, Paket C insgesamt neu zu planen.

## 3. Replaymetadaten und Tests

**Von GPT vollständig und unabhängig strukturell verglichen:** `tests/replay/accepted_pulse163_vs_126.json` vs. `accepted_pulse164_vs_126.json`: exakt **1040 gleiche IDs**, **1012 vollständige Einträge byte-/strukturidentisch**, **28** ersetzt. **26** mit `pulse164 pause order`, **2** mit `pulse164 early claim` (`b16-rogue-sale#57`, `b18-warrior#391`). Für **alle 28** stimmt `previous_acceptance_163` als vollständiges Objekt exakt mit der vorherigen Datei überein. Kein Eintrag fehlt; dies ist **kein eigenständig ausgeführter 2235er Runtime-Replay**, und der Vergleich selbst beweist nicht, dass jede behauptete Änderung ausschließlich `safety`/Reihenfolge betrifft.

**Claudes berichtete Abnahme:** 17/17 neue C-Tests, 29/29 angrenzende A/163-Tests, 2884/2884 vollständige Node-Tests; 2235 Replays, 1040 akzeptiert, 0 offen/veraltet; ST1.19 Standard 96/96, Failsoft 101/101, beide 0 PageErrors. Die neue 17er Suite prüft die Handler-Buchung, Unterbrechungsgrenzen, Folgehandlungen und teilweise `applyWorld`-Korrekturen; der **eigentliche Gegenfall zusätzlicher Extractorzeit nach Cut fehlt**. Der neue ST-Smoke prüft Uhr/Regeneration und Hostkontext mit kontrollierten Antworten ohne entsprechende `time`-Meldung.

## 4. Niedrig priorisierte Beobachtungspunkte, **keine** zusätzlichen Pflicht-Hotfixes

- **P3-Sicherheitsheuristik Gebäudename:** `pauseSafety` nennt außerhalb von Siedlungen jedes `interior` oder ein Gebäude mit Wort `barn`, `stable`, `tower`, `shack` usw. sicher. Das ist bewusst konservativ, kann aber auch bei einer unbewohnten/zerfallenen Ruine oder einem ungesicherten Stall unerwünscht Gefahren ausschließen. Umgekehrt kann ein offenes `site` in einer Siedlung noch als `inside`/sicher gelten (bekannte A-Rahmengrenze). Später mit echten Spielszenen beurteilen, kein eigenständiger Umbau vor B.
- **P3-Narratorursache heuristisch:** Ein fehlender neuer Figuren-/Kampfrecord löst eine Korrektur aus. Ob Prosa allein trotzdem einen plausiblen Anlass nennt, wird nicht semantisch geprüft. Das ist als Schutzmechanismus akzeptabel; erst natürliche Spieltests zeigen Häufigkeit und Wirkung.
- **Früher Pausenwurf vor späteren Such-/Handlungsereignissen:** Zwei Korpusfälle aus dokumentierten Gründen verändert, keine rohe unautorisierte Lookahead-Ausnahme. Fachlich akzeptiert.

## 5. Weiteres Vorgehen

**Zuerst den engen P2-Zeit-Fix auf `.164`**, mit Rot/Grün auf dem echten Handler→World-/Extraktorpfad, voller Node-/Replay-/ST-Abnahme und eigenem kleinen Patchnote-Eintrag. Danach gezielter Kontrollreview. **Erst anschließend Paket B starten**, weil B die Dungeon-Rasten gerade an dieselbe Zeit-/Unterbrechungslogik anschließen wird. **Keine** PULSE-Parameteränderungen, neue NPC-Logik, größere Neuentwicklung, zusätzliche Sicherheits-Heuristiken oder Pflicht-Naturtest zwischen C und B.

Diese Bewertung ist ausschließlich ein Code- und Dokumentationsreview; der Produktbranch wurde nicht verändert.
