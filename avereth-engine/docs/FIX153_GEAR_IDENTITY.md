# .153 – Physische Gearidentität hinter Katalogaliasen

Basis: `.152` / `339f88a`. Anlass: [Batch26, Warrior I479–I481 und GPT-Gegenreview §8](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/batch-20261103-015806Z/REVIEW.md). Implementiert als eng begrenzter Objektfix; keine neue Finanzregel.

## Ursache und Korrektur

Der Katalog bot die getragene Fine-Mail als `item.obj.t143.fine_f_rank_chain_mail` an. Der Originalplan legte zuerst die bereits gekaufte Superior-Mail an und übergab anschließend die Fine-Mail über diesen Alias. `tradeObject()` behandelte jedoch jedes `item.*` als Sheet-Template. `transferTemplate()` entfernte den Inventarspiegel des Originals und erzeugte eine zusätzliche Rüstung beim Schmied. Das Original blieb mechanisch beim PC und konnte anschließend nochmals für 4 cp verkauft werden. I479/I480 verletzten die Inventarinvariante; der später gültige Endstate verdeckte die zusätzliche physische Einheit. Keine doppelte Geldtransaktion nachgewiesen.

- `trade.js`: Eine interne Auflösung bindet `item.obj.<id>` ausschließlich an das existierende physische Objekt. `tradeObject`, `heldUnits`, `saleUnits` und der Preflight/Commit von `bookSale` verwenden diese Identität. Fehlende Objekte werden nicht aus einem Sheetcounter erfunden. Roh-ID und Alias derselben Einheit dürfen nicht zwei Verkaufspositionen bilden. Gespeicherte Gebotszeilen können beide Referenzformen verwenden.
- `commands.js`: Das bereits vorgesehene DROP getragener Aliasware führt weiterhin zuerst UNEQUIP aus. GIVE/Verkauf machen getragene oder fremde Ware nicht durch einen Alias verfügbar.
- `catalog.js`: Der bisherige Katalogvertrag bleibt erhalten und wird kommentiert. Nur die IDs umzubenennen wäre beim kombinierten Originalinput unzureichend: Das Eingabeschema wird vor EQUIP aufgebaut.

Die bestehende physische Move-/Splitroute erhält Objekt-ID, Profil, Herkunft und Mengen. Echte `item.<template>`-Bestände behalten ihre bisherige Materialisierung. Keine Änderungen an Preisen, Geldinterpretation, Prompts, Protokoll, Kampf, XP oder Testspieler.

## Originalquelle und Regressionen

`tests/v4/fixtures/batch26_gear_alias.json.gz` enthält den Originalprefix I0–I478 mit 3.217 Events, Text-/Inputhashes sowie Spielertext, aufgezeichneten Plänen und Extractorantwort I479–I481. Anzeige- und Modelltelemetrie sind weggelassen; der Anfangszustand wird durch den tatsächlichen Hostfold hergestellt.

Original-ZIP: `batch-20261103-015806Z.zip`, SHA-256 `c58f4717b20b5463a994ad8a6e651e6d6ad50c3754bce2cc6de1ba05fc5b4bac`. Erneut aus dem hochgeladenen Original bereitgestellt und geprüft; kein neuer Upload der vollständigen ZIP nach Git behauptet. Fixture-SHA-256: `f7a499c0588c6e53791ae2b6e8180642083d9471de30a9067d80a5d1f4ca2cba`.

Sieben Tests in `tests/v4/fix153_gear_identity.test.js`:

1. Originalkatalog → Planner/Schema → EQUIP/GIVE → persistierter Reply/Extractor → ursprünglicher Verkaufsversuch. Nach jedem Record gültiger State, keine Kopie und kein Weiterverkauf bereits übergebener Ware. Die separat gekaufte zweite Superior-Mail bleibt erhalten.
2. Getrenntes EQUIP→GIVE/DROP und UNEQUIP→GIVE mit unverändertem Profil.
3. Keine übertragbaren Einheiten durch getragenen Alias; bestehendes DROP mit vorherigem UNEQUIP funktioniert.
4. Fehlende/fremde physische IDs trotz irreführendem Inventarcounter nicht als PC-Template auflösen.
5. Physische Stapel, Teilverkauf, Alias-/Roh-ID-Duplikat, gespeichertes Gebot und verweigerter Wiederverkauf.
6. Tatsächliche Templateware wird weiterhin nur in der übergebenen Menge materialisiert.
7. Echter `onEditedV4`-Pfad mit Wiederherstellung/Regenerate sowie veränderter Reply-/Swipefassung, JSON-Reload und Eventfold ohne Objektverdopplung.

Rot auf unverändertem `.152` in separatem Worktree: **5/7 fehlgeschlagen, 2 positive Kontrollen grün**. Auf `.153` **7/7 grün**. Die Änderung korrigiert neue Ausführungen; sie schreibt keine schon gespeicherten historischen Events oder Kopien rückwirkend um.

## Abnahme

| Prüfung | Ergebnis |
|---|---|
| Neue und angrenzende Gear-/Handelstests | 79/79 |
| Vollständiges `npm test` | 2714/2714 |
| `npm run replay:check` | 2235 Fälle; unverändert 479 exakt akzeptierte Baselineabweichungen, 0 neue/offene/veraltete Einträge; keine Fingerprintänderung |
| Echter ST1.19-Standard-Smoke | 42/42, ohne PageErrors; 43 Provideraufrufe, 17 Extraktionen |
| Echter ST1.19-Failsoft-Smoke | 47/47, ohne PageErrors; 49 Provideraufrufe, 19 Extraktionen |

Der Original-Gearfall läuft über die Produkt-Hostfunktionen im Node-Test, nicht als neuer natürlicher Modellrun. Die echten ST-Smokes prüfen die unveränderten Host-, Finanz-, Save-, Fetch-, Swipe-/Reload-/Regeneratewege mit Mockprovider. Kein natürlicher Batch gestartet.

Der erste Standardlauf war **41/42, fehlgeschlagen** ausschließlich an `noPageErrors`: ST meldete `AbortError: The user aborted a request. @ openai.js:4565`. Alle Fachprüfungen bestanden dort bereits. Der unverändert wiederholte Standardlauf und der erste Failsoftlauf bestanden vollständig; keine Fehlerunterdrückung und kein Produktworkaround. ST1.19/Chromium153, dieselben Aufrufzahlen wie `.152`; kein nativer Windows-EPERM-Nachweis. Verwendet: `npm run smoke:st:c` mit `AVERETH_SMOKE_FINANCE=1 AVERETH_SMOKE_SAVE_RECOVERY=1 AVERETH_SMOKE_FETCH=1`, beim Failsoftlauf zusätzlich `AVERETH_SMOKE_FAILSOFT=1`.

## Grenzen

Der Fix bewertet keine neuen Handelsformulierungen und ändert keine Entscheidung zwischen Aufbewahrung, Geschenk und Verkauf. Der vorhandene GIVE-Plan bleibt maßgeblich; eine danach nicht mehr gehaltene Rüstung wird nicht erneut als PC-Ware verkauft. Batch26 bleibt historisch ein fortsetzbarer Lauf mit lokaler Integritätsverletzung. Weitere Naturtests sollen die technische Stabilität messen; aus diesem Fix folgt kein automatischer 10B-Abschluss.
