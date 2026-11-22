# Unabhängiger Codegegenreview – Build .95 / zwei Run-19-Fachpakete

**Produktstand:** [`681c2b4f6a85a30b2dba4357cd621f483ed42be5`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/681c2b4f6a85a30b2dba4357cd621f483ed42be5), Build `4.3.0-c.6.6.95`, Entwicklungsbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`. Ausgang `.94`, [Original-Run 19](20261026-044406Z-current_test.zip), [ursprünglicher Review](REVIEW.md), [Gegenreview](COUNTERREVIEW_CORRECTIONS.md). Umsetzung: [Handelspatchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/681c2b4f6a85a30b2dba4357cd621f483ed42be5/avereth-engine/docs/PATCH_RUN19_TRADE_CONSENT.md), [Gildenorte](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/681c2b4f6a85a30b2dba4357cd621f483ed42be5/avereth-engine/docs/PATCH_RUN19_GUILD_PLACES.md).

**Prüfumfang:** Vollständiger Produktcommit-/Testdiff, aktuelle `trade.js`, `economy.js`, `planner.js`, `runtime.js`, `agency.js`, `commands.js`, `domain.js`, `world.js`, `tests/v4/patch_run19.test.js` und Original-T82/T89-Pläne in `fixtures/run19.json` unabhängig statisch geprüft. **Keine eigene Ausführung der 1846 Node-Tests, keine ST-Probe und keine natürliche GLM-Abnahme. Produktcode unverändert.**

## 1. Urteil

**Die beiden bekannten Fehlerketten sind in sinnvoll begrenzter Form korrigiert. Keine nachgewiesene neue .95-P1-Regression.** Ein natürlicher Level-15-Lauf ist vertretbar. Die Sicherung bei weiteren, vom Planner falsch gebündelten Zahlungen hat jedoch eine **präzise nicht getestete temporale Grenze** (§4): korrekte Einzelpreise sind noch kein Beleg, dass beide Positionen *jetzt* gekauft werden dürfen. Keine zusätzliche große Implementierungsrunde allein wegen dieser Codebeobachtung; eine schmale negative Regression ist gerechtfertigt.

## 2. Handel – T82 und T89

- `trade.js:positionPrices` kann getrennte Währungsnennungen anhand der im aktuellen Angebot tatsächlich ausgewählten Positionen abgleichen. Nur eine eindeutige 1:1-Zuordnung mit korrektem jeweiligen Positionstotal gilt als erfolgreich; bei Unsicherheit fällt die Funktion auf konservatives `tradePrice` zurück. Die unveränderte `acceptanceWhy`-Prüfung schützt weiterhin falsche Mengen, Partei, Rabatt und Gesamtsumme.
- `planner.js:MECH_RULES` fordert ausdrücklich, *jetzt* bezahlte Positionen von erst *morgen* gekauften Leistungen zu trennen; insbesondere für Original-T89 soll nur `l1` Bett zu 2 cp gebucht werden, `l2` Frühstück zu 1 cp nicht.
- `planner.js:parsePlan` markiert Handelszustimmungsfehler **strukturell**, und nur wenn sämtliche verbleibenden Fehler ausschließlich diese Kategorie sind und keine Kampfsituation besteht. `runtime.js:planMessage` gibt nach dem normalen Repair einen einzelnen `clarify`-Befehl zurück, sodass `mapPlan` ein **System-Panel ohne World-/Coin-/Story-Events** erstellt. Die Regression prüft den Original-T89-Doppel-Fehlplan mit `events.length === 0`, `failed:false` sowie Replay.
- Bei ungültigem JSON/Schema, anderem fehlerhaften Befehl oder Providerfehler bleibt ein echter Abbruch; der originale Sicherheits-Guard wird nicht ausgeschaltet. Es wird weder der bereits abgeschickte Usertext editiert noch automatisch neu gesendet. Kauf von nur `l1` und abhängiges Schlafen werden ebenfalls end-to-end geprüft.

**Differenzierung:** Der neue Fallback macht den fehlerhaften Original-Planner **nicht automatisch korrekt** – er ermöglicht eine sichere Spielerpräzisierung im folgenden Zug. Das ist fachlich und für lange natürliche Runs vorteilhaft.

## 3. Guild – T59, T20 und Negativfälle

- `commands.js:go` nutzt nicht länger `/\bguild\b/` als hinreichenden Grund zur Gildenhallen-Umleitung. Die Funktion `guildDestination` in `domain.js` akzeptiert eine als Ziel benannte Guild Hall/Branch/Desk/Counter/Reception, optional in einer eindeutig bekannten Stadt, und legt bestehende Knoten zugrunde.
- `world.js:resolvePlace` verwendet dieselbe Klassifikation. Die ursprüngliche **Asterhall Guild branch** verweist nun auf `loc.asterhall.guild_hall`; bei einer gesuchten **inn near the Guild hall** bleibt die *Gaststätte* das Ziel. Dadurch kann ein korrekter `hallOf`-Vorfahre erhalten bleiben, statt eine ungetaggte Parallelfiliale anzulegen.
- Ohne kanonische Branch in Thornbury/Marrowbridge bleibt eine formale Auszahlung verweigert. `hallOf` und `completeContract` wurden nicht aufgeweicht; echte Gildenunterräume sind wie bisher über ihre Vorfahren gültig.
- Historisch falsch angelegte Orte und der verbliebene falsche Bürokratie-Thread werden bewusst nicht automatisch umgeschrieben. Natürlichen Test in einer **neuen Kampagne** durchführen.

## 4. Offene Abnahmegrenze: korrekte Preise, aber spätere Position fälschlich ausgewählt

**Aus dem Code ableitbarer, bislang nicht durch die 15 neuen Tests belegter Negativfall:**

> User: `Two copper for the bed now, and one copper for the soup tomorrow. I pay for the bed now.`  
> Fehlerhafter Planner: `offer.accept` mit **beiden** `lines:["l1","l2"]`, `agreed_cp:3`, und einer `quote`, die beide Positionspreise enthält.

`positionPrices` sieht jeweils *einen* korrekt zugeordneten Preis für Bett (2 cp) und Suppe (1 cp); seine Klauselprüfung beachtet **keine Temporalität**. `acceptanceWhy` sieht dann einen stimmigen Gesamtpreis von 3 cp. `agency.js:guardCommands` entscheidet bei `offer.accept` über die **gesamte** Handlung; es verhindert nicht unabhängig eine spätere Position innerhalb einer gemischt gegenwärtigen/späteren Annahme. Somit **kann** ein weiterhin fehlerhafter Planner trotz korrekt erkannter Einzelpreise einen vorgezogenen Kauf legitim erscheinen lassen. Im tatsächlichen T89-Original war dagegen **nur** der Bettpreis 2 cp ausdrücklich genannt, weshalb die neue Preisprüfung diesen konkreten Doppel-Scope weiterhin blockiert.

**Wichtig:** Dies ist ein **statischer Risiko-/Testlückenbefund**, kein selbst durchgeführter Funktionsreplay und kein in einem neuen .95-Naturrun beobachteter Fehler. Er widerspricht nicht den berichteten 15/15 Tests. **Minimaler Prüfauftrag:** Eine einzige negative `acceptanceWhy`-/Planner-Regression „Bett jetzt, Suppe morgen, beide Lines irrtümlich ausgewählt“ gegen echte Original-Angebots-Fixtures ausführen. Wenn die Engine den vorgezogenen Kauf bereits an anderer Stelle sicher verhindert, den Schutz konkret nachweisen; andernfalls den bestehenden Zustimmungspfad **eng begrenzt** absichern, ohne neue Wortlisten oder einen neuen Trading-Parser zu bauen. Korrekte sofortige Zustimmung zu beiden Positionen und Original-T89-Bett-only bleiben positiv.

Ein zweiter, gering gewichteter Sprachrand: `guildDestination` normalisiert `Adventurers' Guild hall`, nicht ausdrücklich die ebenfalls verbreitete Singularschreibweise `Adventurer's Guild hall`. Dieses reine Synonym-Risiko rechtfertigt **keine** selbständige weitere Patchrunde; bei Auftreten im natürlichen Lauf konkret nachprüfen.

## 5. Testbewertung und nächster Schritt

**Implementiererangaben:** 15 neue Regressionen (**5 vor Fix rot, 10 Kontrollen grün**), anschließend 15/15; angrenzend 167/167; gesamte Node-Suite 1846/1846 ohne Skips. ST-1.19-Mock-Smoke 21/21, fünf Extractor-Aufrufe, vier tatsächlich gespeicherte aktuelle Story-Replies jeweils mit genau einem `extract.applied`, keine PageErrors. Intermittierender Reload-Mock-Befund im Zwischenlauf, isoliert auf Wiederholung grün, Ursache nicht nachgewiesen. Die Zahlen sind **keine unabhängig von ChatGPT neu ausgeführten Tests**.

**Empfehlung:** Natürlichen `.95`-GLM-Test mit aktuellem Level-15-Guide starten und Level-/XP-/Gear-/Skill-Fortschritt, Händlerpreise und echte Zeitpunkte, Gildenort-/Turn-in-Aktionen sowie System-Klärungen beobachten. Ein echter `clarify`-Turn ist kein Testabbruch und darf für die Bilanz nicht als gebuchter Kauf gezählt werden. Den nicht reproduzierten temporalen Sicherheitsrand gezielt testbar machen, aber keinen zusätzlichen Runnerumbau, keine Stat-/XP-Erhöhung und keine Story-/Save-Migration veranlassen.

**Keine Produkt- oder Runneränderung in diesem Gegenreview.**
