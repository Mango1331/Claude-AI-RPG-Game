# Run 20 – Extractor-Szenenchronologie, Repair-Abbruch und gebuchte Wahrheit

**Status:** Technischer Fachpatchplan, NICHT implementiert, keine Balancefreigabe. **Bezug:** Run `20261026-063907Z-current_test`, T251/T252, Build `.95` (`681c2b4`). Stand 26.10.2026. Die [Run-20-REVIEW](../testrun_10b/20261026-063907Z-current_test/REVIEW.md) und [Sols Gegenbefund](../testrun_10b/BALANCE_ERSTEINDRUECKE_XP_STARTWERTE_20261026.md) sind die Beobachtungsquellen. Der Originalexport ist im Review mit SHA/CRC belegt; auf `main` liegt die ZIP nicht nachweislich vor.

## Befund und gesicherte Abgrenzung

- **T252:** Ein gültig geplanter Rückweg Black Weir → Eel-Weirs wird erzählt, aber die Extraktion scheitert. Die erste Extractor-Antwort (Call 726, 5.344 ms) enthält `thread` vor einer späteren `arrive`-Aktion, gibt für den früheren Thread aber keine eigene `scene` an. `parseExtraction()` meldet präzise `$.deltas[1].scene`: Die spätere finale Reply-Szene darf nicht rückwirkend auf frühere Vorgänge angewendet werden.
- Ein Repair (Call 727) liefert nach **120.005 ms** keine gültige Modellantwort; beide Calls zusammen **125.349 ms**. `index.js:v4Llm()` verfügt über `LLM_TIMEOUT_MS=120000`. Ein Timeout ist plausibel, aber warum die Providerantwort fehlte, ist damit noch nicht bewiesen. Danach: `signal is aborted without reason`, `extract.failed`, keine Buchung der Ankunft, Zeit, des Threads oder Quest-READY.
- **Separater Questanspruch:** Die Erzählung behauptet vier besiegte Bog Striders, Enginezustand ist aber **3/4**. Bei T251 verweigert die Engine einen ungedeckten READY-Anspruch; Sols isolierte T252-Sonde ohne den fehlerhaften Thread bucht Ankunft, verweigert READY und zahlt nichts. In der natürlichen T252-Antwort wurde der fragliche `quest.ready`-Vorschlag **nicht angewendet**; er verursachte den konkret protokollierten Repair **nicht**. Kein festgestellter Fehler des Killzählers oder READY-Guards.
- **Vorhandener Mechanismus:** `src/v4/extract.js:parseExtraction()` prüft frühere Deltas vor späteren Ankünften; `src/v4/runtime.js:runExtraction()` hat ein Repair nach ungültiger Erstantwort und bei Transportfehler des *ersten* Calls einen gesonderten Recovery-Pfad. Bei Transportfehler im *Repair* gibt es derzeit keine weitere Recovery. Die bereits vorhandene Prüfung auf aktuelle Message/Swipe verhindert nachträgliches Eintragen in fremde Turns.

## Zielbild des Fachpatches

1. **Szenenchronologie erhalten:** Der Extractor soll Vorgänge in der Reihenfolge der Erzählung korrekt annotieren; frühere lokale `thread`-/Fakten-/Personen-Deltas besitzen bei einer späteren Ankunft eine explizite Ausgangsszene. Die bisherige strenge Validierung nicht abschwächen, keine Eventumsortierung anhand des Endorts, keine erfundene Ankunft.
2. **Repair fachlich präzisieren:** Der auf `$.deltas[i].scene` begrenzte Fehler muss im tatsächlich versendeten Repairkontext auffindbar und eindeutig behebbar sein. Bestehende Schema-Regeln/Beispieltexte zuerst prüfen; zielgerichtete Repair-Anweisung nur ergänzen, wenn der aktuelle Auftrag die früheren Szenen nicht ausreichend erklärt. Der Repair soll die vorhandene `scene`-Angabe korrekt einsetzen und sämtliche übrigen unabhängigen Deltas/Expected-Felder beibehalten.
3. **Transportursache vom Schemafehler trennen:** Bei fehlgeschlagenem Repair unterscheiden und protokollieren: Modellausgabe ungültig, Fetch/Netzwerk/Providerfehler, Timeout bei 120.000 ms, äußeres Cancellation-Signal und veraltete Reply/Swipe. Die Fehlerkette aus T252 gezielt nachstellen, bevor ein zusätzlicher LLM-Call vorgesehen wird.
4. **Eng begrenzte Wiederherstellung statt Retry-Kaskade:** Bestehende Limits und Abbruchpfade untersuchen. Einen möglichen dritten Call bei einem bloßen Repair-Transportfehler **nicht automatisch freigeben**; zuerst prüfen, ob ein sicherer/zeitlich begrenzter Recovery-Weg gegenüber dem bisherigen terminalen `extract.failed` nachweisbar besser ist. Jede Retry-Variante muss die unveränderte Originalantwort, Request-Identität, Turn-Aktualität und nur einmalige Eventbuchung sichern. Kein erneutes Abschicken der Spielerhandlung als Ersatz für fehlende Extraktion.
5. **Wahrheit sichtbar halten:** Wenn alle gültigen Versuche scheitern, bleibt der Turn ausdrücklich **NOT RECORDED** mit alter tatsächlicher Engineposition. Eine erzählte Rückkehr, vierte Tötung oder Gildenauszahlung darf nie zur Wahrheit werden, nur weil der Narrator sie formuliert hat.
6. **Kein Quest-Redesign:** `countShort()`, `contractReady()`, `quest.ready` und die alternativen echten Zielerreichungswege nicht pauschal abschalten oder auf lockere Textzählung umstellen. Nur prüfen, ob ein ungedeckter READY-Versuch im selben Antwortkontext korrekt abgewiesen wird.

## Konkrete Regressionen

**T252-Extraktor / Szenen:**

- Originalreihenfolge `thread(seq=1, scene=null)`, `arrive(seq=2, at=Eel-Weirs)` bei finaler Szene Eel-Weirs → vorhandener präziser Fehler an `$.deltas[1].scene` (Index wie im Original), Repair-Auftrag benennt Ausgangsszene; ein danach korrekt annotierter Thread + Ankunft werden chronologisch verarbeitet. Die fachlich gültige Reihenfolge darf nicht automatisch umsortiert werden.
- Dieselben Deltas mit expliziter vorheriger `scene` → gültige Ankunft und Thread; ohne Ankunft keine fiktive Ortsänderung; bei verweigerter Ankunft kein lokaler Fakten-Commit am unerreichten Ziel.
- Reparatur einer *anderen* ungültigen Deltazeile darf gültige erwartete Reiseantworten nicht löschen. Eine valide, aber in `expected` unvollständige Extraktion behält die bestehende Semantik teilweiser Vollständigkeit; nicht pauschal alle Deltas verlieren.

**Transport und Lifecycle:**

- Deterministischer Stub: erster Call liefert Original-Schemafehler, Repair wirft `AbortError`/simulierten Timeout → begrenzter, eindeutig markierter Ausgang; kein `pending`-Hänger, keine Ankunft/Quest-/Geldbuchung, keine doppelten Events. Den **erwarteten** Ausgang vor Implementierung festlegen: terminal failed oder enger explizit genehmigter Recovery-Weg.
- Reale und simulierte Cancellation durch Chatwechsel, Swipe, User-Abbruch sowie `isCurrent=false` vor/zwischen Calls → keinerlei stale Commit und kein ungeprüfter erneuter Call.
- Erfolgreicher Repair nach dem Originalfehler → einmaliges Apply, deterministischer Replay/Reload und nachvollziehbare Call-Telemetrie (Callzweck und Dauer). Keine Aufhebung der 120-s-Abbruchkontrolle, um einen Test grün zu bekommen.

**Quest-Wahrheit:**

- Vertrag `DEFEAT 4`, Engine zählt `3/4`; Narrator behauptet `4/4`, Extractor meldet `quest.ready` ohne glaubhafte alternative tatsächliche Zielerreichung → READY verweigert, keine Quest-/XP-/Kupferauszahlung. Diese Guard-Probe ist **schon jetzt grün** und bleibt ein nicht zu regressierender Schutz; sie ist kein Beleg für einen neuen Quest-Bug.
- Bei vier tatsächlich gebuchten Kills oder einer nach den bestehenden Regeln gültigen unabhängigen Alternative bleibt ein legitimer Abschluss erreichbar; nicht sämtliche READY-Meldungen verwerfen.

## Grenzen, Tests und Abnahme

**Betroffene Pfade:** `avereth-engine/src/v4/extract.js` (Parser/Formatregeln), `src/v4/runtime.js` (Extractor-Repair und Recovery/Apply), `index.js` (Transport-Timer/Abort-Telemetrie), passende V4-/Hosttests. `src/v4/world.js`, `guild.js` nur bei durch Regression bewiesenem Guarddefekt ändern. Bestehenden World-Job-Lifecycle verwenden, keine zweite Warteschlange.

**Abnahme:** T252-Schemafehler und Retry/Timeout mit reproduzierbarer Stubkette dokumentieren; vor Fix nachweisbare Lücke und nach Fix gewünschte Verhaltensänderung getrennt belegen. `npm test` und `npm run smoke:st:c` auf dem Entwicklungsbranch; reale ST-Provider-Abnahme anschließend. Produktversion/technische Patchnote erst **nach** Implementierung/Test erhöhen bzw. schreiben. Keine pauschale Garantie, dass eine spätere externe Providerstörung durch die Engine verhindert wird.