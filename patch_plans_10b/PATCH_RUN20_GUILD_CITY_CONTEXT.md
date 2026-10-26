# Run 20 – Guild-Zielauflösung mit ausdrücklichem Stadtbezug (T203)

**Status:** Technischer Fachpatchplan, NICHT implementiert. **Bezug:** Run `20261026-063907Z-current_test`, T203, Produktbasis `.95` (`681c2b4`); [Run-20-Review](../testrun_10b/20261026-063907Z-current_test/REVIEW.md), [Sols Gegenprüfung](../testrun_10b/BALANCE_ERSTEINDRUECKE_XP_STARTWERTE_20261026.md). Unabhängig von Scaling, Gildenbalance und Questvergütung.

## Reproduzierter Fehler und Codeursache

Der PC ist bereits in **Wethervord**. Die Spielerhandlung lautet sinngemäß **"I cross the bridge into Wethervord and enter the Guild hall, then turn in ..."**. Der Planner beschreibt ein mehrteiliges Reiseziel, der Guild-Hall-Anteil erscheint als **unqualifiziertes** Ziel. Die `.95`-Ortsauflösung führt deshalb über `commands.js:go()`, `guildHallMeant()` und `domain.js:guildDestination()` zur aktiven Vertragsfiliale **Alderwatch**. Tatsächlich wurde `scene.moved` nach `loc.alderwatch.guild_hall` und danach eine Zahlung von 150 cp gebucht. Der Stadtwechsel entspricht nicht der ausdrücklichen Spielerhandlung.

Der Fix aus Run 19 (`PATCH_RUN19_GUILD_PLACES.md`) erkennt Guild-Zielnamen statt beliebiger Guild-Landmarken und schützt explizite `Guild hall in <Stadt>`-Ziele. T203 zeigt die verbleibende Lücke: Die Stadt wird **in derselben Spielerhandlung an einer vorangehenden Stelle** genannt, während der Hallen-Teilbefehl nur noch `Guild hall` lautet. Die bisherige Fallback-Logik betrachtet `scene.at`, aktive Vertragsfiliale und registrierte Filiale, aber nicht zuverlässig die qualifizierende Bedeutung der gesamten mehrteiligen Handlung.

## Gewünschtes Verhalten

1. **Spielerreferenz hat Vorrang vor Vertrags-Fallback.** Ein ausdrücklich genannter, eindeutig bekannter Ortsbezug derselben Handlung (einschließlich früherer, syntaktisch/semantisch damit verbundener GO-Teilschritte) ist für `enter the Guild hall` maßgebend. Der Fallback auf Vertrags-/Registrierungsfiliale gilt nur für eine **tatsächlich ortsungebundene** Gildenreise.
2. **Keine heimliche Fernreise.** Eine Nachricht mit Wethervord als ausdrücklichem Handlungsort darf nicht allein durch einen unqualifizierten Hallen-Subcommand nach Alderwatch umgelenkt werden. Ist in Wethervord keine kanonische Engine-Gildenhalle etabliert, muss die Engine diese Halle ablehnen bzw. präzise klären und die Abgabe dort nicht buchen. Sie darf keine fiktive Zweigstelle anlegen.
3. **Mehrteilige GO-Kette korrekt behandeln.** Bereits geplante vorangehende Reiseziele oder explizite Ortsqualifikationen dürfen für die *Zielauslegung* späterer Teilhandlungen verwendet werden, sind aber keine Beweise einer **tatsächlich vollzogenen** Ankunft. Geplante Gildenabgabe bleibt von nachträglich bestätigter Hallenankunft abhängig; Teilstopps/Hindernisse unterbrechen sie. Reines Nennen einer Stadt bewegt den PC nicht.
4. **Gemeinsamer kanonischer Ortsbegriff.** `commands.js` und `world.js` verwenden dieselbe Guild-Hall-Identität aus `domain.js`; von der Engine abgelehnte Ziele können über das Erzähl-/Extraktionssystem nicht als Ersatzfiliale hergestellt werden. Bestehende Innenräume einer echten Halle bleiben über ihre Elternhalle gültig.
5. **Keine pauschale Abschaffung des Fallbacks.** "Back to the Guild" ohne Stadtbezug in freier Wildnis darf weiterhin die eindeutig etablierte aktive Vertrags-/Registrierungsfiliale meinen, soweit die bisherige zulässige Regel dies vorsieht. Bei mehreren relevanten möglichen Filialen korrekt unterscheiden, nicht beliebig raten.

## Umsetzungshinweise / begrenzter Umfang

- Das Problem in `src/v4/commands.js` am Moment der GO-Zielauflösung behandeln; die zuständige gemeinsame Resolverfunktion liegt in `src/v4/domain.js`. Die verfügbaren `ctx.auth.gos`/`seq` und `quote`/`to`-Felder auf Eignung prüfen, statt eine freie Textregex für sämtliche Ortsangaben oder einen separaten Parser zu bauen.
- Unterscheide ausdrücklich: **qualifizierte Gildenreise zu bekannter Stadt**, **mehrteilige Spielerhandlung mit Ortskontext**, **echter unqualifizierter Guild-Fallback**, **Guild nur als Landmarke**. Die Stadtzuordnung muss aus dem tatsächlich vorhandenen Planner-/Player-Beleg folgen, nicht aus vermuteten Narratorabsichten.
- `hallAhead()` und Conditional-`quest.turn_in` dürfen ausschließlich eine gültige autorisierte Hallenreise übernehmen; *ausgewähltes Ziel* und *bestätigte Ankunft* bleiben getrennte Größen. Wenn ein Ziel wegen fehlender Filiale abgelehnt wird, gibt es keinen Hallen-Conditional und keine Auszahlung.
- Keine neuen Guild-Halls in Wethervord, Thornbury oder Marrowbridge erzeugen, keine Nachmigration historischer falsch gebuchter Städte, keine Änderung des Vertragsstatus-/Belohnungsmodells.

## Regressionen (zuerst gegen `.95`)

1. **Original T203**: PC in Wethervord, aktiver Guild-Vertrag aus Alderwatch; `cross bridge into Wethervord → enter Guild hall → turn in`. Falls Wethervord keine gültige Hall besitzt: keine Ankunft in Alderwatch, kein 150-cp-Payout, kein unbegründetes `quest.completed`. Der Test muss auf `.95` den echten Fehler zeigen.
2. **Explizite Stadt im selben Einzelbefehl:** `Guild hall in Wethervord`, Stadt ohne Hall → abgewiesen statt Alderwatch-Fallback. `Guild hall in Alderwatch` mit kanonischer Hall → korrekt nach Alderwatch autorisiert; Auszahlung erst nach bestätigter Ankunft.
3. **Bereits in Stadt, unqualifizierter Halleteil:** PC an bekannter Brücke/Innenstelle von Wethervord, sprachlich ortsgebundene Anweisung → nicht still Vertragsstadt wählen. Umgekehrt tatsächlich unqualifizierte Rückkehr aus Wildnis → bisher erlaubter Fallback.
4. **Teilreise nicht vollzogen:** Spieler will erst nach Wethervord, dann zur dortigen Halle, aber Narrator stoppt vor der Stadt oder GO wird abgelehnt → keine Gildenankunft, kein Turn-in. Erfolgreiche erste Ankunft darf zweite nur ermöglichen, nicht garantieren.
5. **Echte lokale Halle/Innenraum:** bekannte Halle im aktuellen Settlement sowie Hallen-Rezeption/Desk dort → korrekte vorhandene ID. Mehrere GO-Schritte und nachfolgender `quest.turn_in` verwenden ausschließlich die tatsächlich erreichte Halle.
6. **Run-19-Nichtregressionen:** Guild als Landmarke eines Gasthauses (T59), Phantom-Branch (T20), Thornbury/Marrowbridge, echte `hallOf()`-Vorfahren, abgelehnte Abgabe ohne Auszahlung. Save/Replay/Regenerate/Swipe bleiben deterministisch.

## Abnahme

Originalfall als Rot/Grün-Regression mit festem Planner-/State-Input; außerdem valide einfache und mehrstufige Guild-Reisen. `npm test` und `npm run smoke:st:c`; in der technischen Dev-Patchnote genau angeben, welcher Resolverpfad korrigiert und welcher T203-Zustand erhalten wird. Kein Anspruch, dass der Narrator niemals mehr einen falschen Gildenort erzählt; verbindlich sind die Engine-Ankunft und -Abgabe.