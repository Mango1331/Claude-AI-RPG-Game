# Build .117 — Generative Gildenfilialen

29.10.2026 · Basis: .116 / `846a7c3` · Produktbranch: `claude/c-planner-prototype-2026-10-02-gpt-c666`.

## Ursache und Ziel

Batch13 (`batch-20261029-091447Z`), Warrior T14/ST27–28: Ein READY-Wolfvertrag wurde zur neu erzählten Stonebrook-Gilde gebracht. Nur vorbereitete Gildenorte besaßen funktionalen Status; neue, unterschiedlich benannte Hallen blieben gewöhnliche Orte oder wurden als Ankunft abgewiesen. Die Engine verhinderte falsche Auszahlungen, während Narrator und Spieler über weitere vermeintliche Zahlstellen in eine Schleife gerieten. Es gab 43 verweigerte Abgaben, keine Questzahlung.

Verbindliche neue Richtung: Der Narrator darf betriebene Adventurers'-Guild-Filialen etablieren, auch in generierten Siedlungen. Die Engine verleiht den funktionalen Status und übernimmt weiterhin sämtliche Gildenmechanik. Eine Filiale pro kanonischer Siedlung; keine globale Weltgrößengrenze.

## Umsetzung

- `content/deltas.json`, `extract.js`, `ownership.js`: kleines World-Delta `guild.branch {place, evidence}`; Vokabular `delta-1.8`, Extractor `extract-5.18`. Bestehende `place.created`/`place.updated`-Events, kein neuer Eventtyp oder Filialregister. Die Evidence muss eine wörtliche narrativ etablierte Passage mit Staffhinweis sein (clerk/registrar/receptionist/staffed/operating); vorhandenes `narratedEvent` weist fehlende, zitierte, erinnerte, verneinte oder zukünftige Belege zurück. Ein Schild allein ist kein Staffbeleg. Fachliche Einordnung als betriebene Adventurers'-Guild bleibt eine Aufgabe des Extractors, kein vollständiger Sprachbeweis.
- `domain.js`, `place_refs.js`, `world.js`: Neue Hallengebäude dürfen gewöhnliche Orte sein. Funktional werden sie nur durch bestätigtes `guild.branch` in einer kanonischen Siedlung, außerhalb eines Dungeons. Bestehende Orts-IDs bleiben erhalten. Eine zweite konkret identifizierte Empfangsstelle wird unter die vorhandene Filiale eingeordnet; erkennbare Hallenvarianten verwenden gleich deren ID. Eine entfernte Filialetablierung bewegt Alaric nicht.
- `commands.js`: Ein ausdrücklicher GO zu einer noch nicht anerkannten Halle kann einen aktuellen Abgabewunsch vormerken. Er bindet ihn an GO-Schritt und benannte Siedlung, statt ihn vorschnell zu verwerfen. Das ist noch keine Registrierung, Zahlung oder Ankunft.
- `world.js`: Neue-Filiale-Abgaben werden erst nach sämtlichen World-Schritten und den bestehenden READY-Prüfungen verarbeitet: tatsächliche gebuchte Ankunft, richtige Siedlung und funktionale Halle erforderlich. Der normale `completeContract`-Pfad entscheidet Zahlung, Quest-XP und Abschluss. Kein Erfolg nur aus Expected, Szenenlabel oder Spielerbehauptung; kein offener Auftrag für spätere Züge.
- `guild.js`: Neue Boards verweisen auf die tatsächliche Hallen-ID. Angebotsschlüssel bleiben Siedlung/Rang/Tag. Filialetablierung erzeugt kein Board und keine Aufträge. Erste spätere ausdrückliche Boardabfrage nutzt den normalen Generator; Namenswechsel erlaubt keinen Refresh.

## Kompatibilität und Grenzen

- Bestehende Glassmere-/andere Contenthallen funktionieren weiter. Historische Events werden nicht migriert. Ruleset 1 erhält keine neuen funktionalen Filialen aus diesem Delta; seine frühere Hallennamensauswertung bleibt erhalten.
- Geänderte historische Run19-/Run20-Tests behalten den Schutz gegen falsche Städte und Auszahlungen. Ihre frühere Forderung, jeden neuen Hallenbesuch zu verweigern, wurde an die ausdrückliche neue Designentscheidung angepasst: Besuch als gewöhnlicher Ort zulässig, kein funktionaler Status oder Geld ohne Nachweis.
- Bei erstmaliger Entdeckung bleiben andere Guild-Aktionen wie Registrierung/Boardabfrage gegebenenfalls bis zur bestätigten Etablierung erneut auszuführen. Nur der kombinierte GO→READY-Turn-in wurde um die neue bedingte Verarbeitung erweitert. Kein zusätzlicher asynchroner Boardgenerator im Extractorpfad.
- Keine Änderung an Boardverteilung, Questwerten, Delivery, Kampf, XP-Multiplikator, Gear oder Testspieler. Keine Änderung am Narrator-Vertrag oder an der persönlichen ST-Karte nötig.

## Abnahme

- Originalfixture: unveränderte vorangehende Events, Plannerkommandos, Narratorprosa und Extraktion aus Batch13/T14; die neue Extraktion ergänzt den expliziten Filialnachweis. Der damalige Export enthielt diesen neuen Typ naturgemäß noch nicht.
- **18 neue Fälle: auf unverändertem .116 16 rot / zwei Kontrollen, danach 18/18.** Rot umfasst fehlendes neues Vokabular/Ownership ebenso wie den eigenständig nachgewiesenen ursprünglichen Fehler: der Originalplan verweigert die Abgabe statt sie vorzumerken. Das sind keine 16 unterschiedlichen Livebugs.
- Gegenfälle: Schild, Hörensagen, Zukunft, Spielerbehauptung, fehlender GO/Ankunft, fremde Siedlung, vorhandenes ungetaggtes Gebäude, weitere Empfangsräume, Wiederkehr, zweite Abgabe, Boardidentität, Ruleset1, Schema-Autorität.
- Runtime-Integration: Originalinput → Planner/Agency → Commands → Extraktion → gespeicherter Record; 40cp genau einmal und Quest-XP über bestehenden Abschluss. JSON-Reload konsistent; ein unextrahierter Swipe behält keine alte Auszahlung, Rückwechsel stellt genau einen gültigen Vollzug wieder her. Vollständige Zustandsvalidierung grün.
- **Vollständige npm-test-Dateiliste: 2297/2297** (Node-Testparallelität4). Ein vorgeschalteter Start mit `NODE_OPTIONS=--test-concurrency=4` wurde von Node abgelehnt, ohne Tests auszuführen; die vollständige Dateiliste wurde anschließend mit dem CLI-Flag ausgeführt. Erster Volltest hatte sechs Fehler: drei durch unnötig veränderte bekannte Ausgabetexte (zurückgenommen), drei durch die ausdrücklich ersetzte starre Hallenregel (oben erläutert).
- **Echter ST1.19-Mock-Smoke: 23/23, sechs Extraktionen, keine PageErrors.** Prüft Host-/Schema-Kompatibilität; der neue Stonebrook-Erwerbs-/Abgabepfad ist durch die Runtime-Integration geprüft. Kein natürlicher .117-GLM-Lauf gestartet.

## Reviewfix .118 — umgekehrte Vorfahrenbeziehung

Der Gegenreview-Befund ist bestätigt: Wird zuerst ein Empfangszimmer als Filiale anerkannt und danach dessen bestehendes übergeordnetes Gebäude genannt, versuchte .117, dieses Gebäude unter das Empfangszimmer zu hängen. Der begrenzte `lineage`-Durchlauf verhindert den Elternzyklus nicht; `validateState` meldete ihn ebenfalls nicht.

Die vorhandene Umhängung prüft jetzt beide Vorfahrenrichtungen. Ein übergeordnetes Gebäude bleibt an seinem bisherigen Elternort; die bereits funktionale Filiale und alle Orts-IDs bleiben bestehen. Keine neue Filialverwaltung und keine allgemeine Ortsmigration. Genau eine neue Regression reproduziert den Fehler auf unverändertem .117 (rot), prüft nachher beide Elternverweise, stabile Filialidentität, zyklenfreie Abstammung und Event-Replay. Fachdatei danach **19/19**, vollständige npm-test-Dateiliste **2298/2298** (Parallelität4). Kein neuer ST-Smoke bei diesem ausschließlich synchronen Ortslogik-Fix; die .117-Abnahme wird nicht als .118-Smoke ausgegeben. Kein natürlicher Lauf gestartet. Der Patch repariert nicht rückwirkend bereits gespeicherte zyklische Ortsdaten; ein solcher Livestand ist bislang nicht nachgewiesen.
