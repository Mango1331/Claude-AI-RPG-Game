# Build .120 — Gildenidentität und doppelte Jagdaufträge

30.10.2026 · Basis `.119 / b09274c` · ein Produktpatch auf `claude/c-planner-prototype-2026-10-02-gpt-c666`.

## 1. Abgabe an einer kanonisch erkannten Gilde

Batch15 `batch-20261029-174048Z`, Mage T141: Der Viperauftrag ist nach Enginezählung erfüllt, der Spieler reist ausdrücklich zur bereits etablierten Gilde im Stelzendorf. Die Ankunft wird gebucht, die Abgabe verfällt trotzdem. `guildDestination` interpretiert „the stilt village Guild hall“ als unbekannten Siedlungsnamen statt als vorhandene Halle. `candidateHallReached` vergleicht danach „stilt village“ mit „stilt village on the Reed Flats“. Das redundante, ungenau zitierte `guild.branch` ist nicht die Ursache: Ohne dieses Delta bleibt die Abgabe auf .119 ebenfalls unbezahlt.

`domain.js` löst passende vorhandene Gildenräume jetzt vor dieser Textinterpretation auf ihre kanonische Hallen-ID auf. Artikel und Possessivformen ändern die Identität nicht. Mehrdeutige Namen oder eine widersprechende eindeutig bekannte Siedlung werden nicht übergangen. `world.js` verwendet die so erkannte Zielidentität auch nach einer Erstgründung. Die bestehende Ankunftsprüfung, funktionaler Filialstatus und `contractReady` bleiben Voraussetzung.

Die Originalkette T141 zahlt dadurch genau einmal40cp und Quest-XP. T127 mit erst5/6 Stridern erreicht nun die tatsächliche Abgabeprüfung und erhält die richtige Zählablehnung statt `cmd.expired`. Eine ausdrücklich als Kontrolle auf fünf erforderliche Kills gesetzte Variante kann beide bereits angenommenen Altverträge abgeben; sie ist kein natürlicher Zahlungserfolg.

**Abgabe an jeder anerkannten Gilde bleibt möglich.** Das war bereits erlaubt; es wird keine zusätzliche Bindung an die veröffentlichende Filiale eingeführt. Die Annahme eines Angebots bleibt an dessen Board gebunden.

## 2. Vorläufig keine doppelten gezählten Jagden

Verbindliche Nutzerentscheidung: Die flexiblere Zuordnung einzelner Kills zu überlappenden Verträgen bleibt eine spätere Idee. Jetzt werden neue doppelte Jagdaufträge verhindert.

`guild.js` verwendet eine gemeinsame Abfrage der vorhandenen mechanischen Ziele:

- Außenjagd: kanonische `hunt.at`-Population; neue Listings verwenden ihre bestehende Habitat-/Ortsauflösung. Titel, Auftraggeber, Menge, Filiale und Tag schaffen keine neue Zielgruppe.
- Dungeonjagd: die tatsächlich passenden Encounter-Slots der benannten Etage, mit demselben `cullKind` wie die Zählung. Gewöhnliche Gegner und ein ausdrücklich benannter Boss bleiben getrennt. Die Etage kommt aus dem Objective-Ziel, nicht aus Warnungen im Aufgabentext.
- Dungeon-Clearance: weiterhin eigener Gesamterfolg, bestehende Clearance-Sperre unverändert. Andere Populationen und mechanisch getrennte Ziele bleiben unabhängig.

Die Abfrage wird bei `parseBoard` gegen aktive PC-Jagden, retained Listings und die übrigen neuen Angebote verwendet. Generator und einmalige Repair bekommen dieselbe Regel sowie die aktiven Jagdziele mitgeteilt. Eine unvollständige reparierte Antwort wird weiterhin nicht als kleineres Board veröffentlicht. Boardrevision5.5; Verteilung4+1 beziehungsweise fünf Jagden unverändert.

`acceptContract` prüft erneut am Buchungspunkt. Damit sind auch ältere bereits veröffentlichte Angebote, zwei Annahmen desselben Inputs und bedingte Annahmen nach Ankunft abgesichert. Solche alten Angebote werden nicht nachträglich gelöscht; `goalText` kennzeichnet den aktiven Zielkonflikt. Nach Abschluss oder Aufgabe kann neue Arbeit angenommen werden, mit der bestehenden Zählung ab Annahme.

Keine neue Kill-Verbrauchsverwaltung, kein zusätzliches Zustandsregister oder Eventformat. Bereits angenommene historische Doppelverträge bleiben beim Replay und bei der Abgabe gültig. Ruleset1 und freie Altverträge ohne kanonische Zielbindung behalten ihre bisherige Semantik. Ein Alpha nur im Titel ist noch kein mechanisch eigenes Weltziel; eine spätere feinere Zielauswahl ist im Ideenkatalog vorgemerkt.

## 3. Abnahme und Grenzen

- Original-ZIP im Chat, SHA-256 `caf3dbed414955802ae598b865926e8a2771a2f5a0a7c3aa95d84eb66923d3c1`. Kein GitHub-Upload behauptet. Fixture enthält Originalevents, Boardantwort, Plannerbefehle, Narratorprosa und Extraktionen für die beiden Ursachen.
- **25 neue Regressionen:** auf unverändertem `.119` **16 rot / neun grüne Kontrollen**, anschließend25/25. Angrenzende Gruppe114/114.
- T141 vollständig über Planner, Runtime und Originalextraktion geprüft: gespeicherter Abschluss,40cp einmal, JSON-Reload, erneuter Extractor-Aufruf sowie Swipe/Rückwechsel. Event-Replay und Zustandsvalidierung grün.
- Jagden: originale zweite Striderannahme und Tagesboard; umbenannte/geänderte Mengen und Filialen; gleichzeitige/bedingte Annahme; neues und teilweise nachgefülltes Board; tatsächlicher Generator-Repair auf fünf gültige Angebote; getrennte Population/Bossziele; neue Arbeit nach Abschluss/Aufgabe; Altverträge und Ruleset1.
- Zwei bestehende Originalboardtests C109/C110 erwarteten bislang fünf gültige Angebote einschließlich eines bereits aktiven Hundeauftrags. Erwartung an die neue Regel angepasst: genau dieser Hundedoppelauftrag wird abgelehnt, der Dungeonhinweis bleibt gültig; die Gegenprobe für ein tatsächlich unzulässiges E-Etagenziel bleibt unverändert.
- **Vollständige npm-test-Dateiliste: 2348/2348**, Node-Testparallelität4. Erster Gesamtlauf2346/2348 hatte ausschließlich die beiden inzwischen überholten Boarderwartungen.
- **Echter ST1.19-Mock-Smoke abschließend23/23**, sechs Extraktionen, keine PageErrors. Erster Lauf23/23; zweiter Lauf22/23 wegen `AbortError: The user aborted a request` aus ST/openai.js bei sonst grünen Fachprüfungen; unveränderter sauberer Wiederholungslauf23/23. Der fehlgeschlagene Versuch wird nicht als Erfolg gewertet. Kein natürlicher GLM-Nachweis aus diesem Mock.

Keine Veränderung an Geldbelegen, XP-/Belohnungswerten, Kampf, Gear, Skills oder Testspieler. Extractor5.19 und Narrator-Vertrag unverändert; kein Kartenupdate erforderlich. Keine Umwertung gespeicherter Events und kein natürlicher GLM-Lauf durch Sol.
