# Avereth Engine – unabhängiger GPT-Kontrollreview von Build `.192`

**15.11.2026 · Stand Produkt `e7dac41764486a93917b8d8aadc34377c6464869` · Dokumentation `main` `1065ed5` vor diesem Review.**

**Prüfumfang:** Remote-Produktcommit und tatsächlicher Diff gegen Runner-Stand `4ed8bf2`, `docs/FOLLOWUP_191_192.md`, die neuen Funktionen in `living.js`, `guild.js`, `world.js`, `run9_evidence.js` und `context.js`, neue Tests `tests/v4/batch191_fixes.test.js`/Hilfsbibliothek sowie `FACHPLAN_KAMPF_BEWEGUNG_ANGRIFF_192.md` auf `main`. **Keine eigene Ausführung** der Node-, Replay- und ST-Smoke-Suite; die Testzahlen 3250/3250, 2235/2235, 225/225 und 230/230 sind von Claude berichtete Abnahme, nicht unabhängige GPT-Messungen. Keine weiteren Modellaufrufe oder Produktdateiänderungen.

## Urteil

**GO für einen nächsten persönlichen natürlichen User-Test mit Beobachtungspunkten.** Die vier Aufträge wurden im Remote-Code nachprüfbar implementiert, und sie ändern nicht die grundlegenden A2-/B5-Architekturentscheidungen. Kein neuer verpflichtender Großpatch und keine Generalarchitekturplanung angezeigt. Vor einem User-Test die ausstehenden natürlichen B5-Fälle und das Kampf-/NPC-Spielgefühl priorisieren.

| Paket | Im Code bestätigtes Ergebnis | Vorbehalt |
|---|---|---|
| **P1 Dungeon-T70** | `living.js contextLines` wirbt während `s.encounter` keine freien Slots mehr; nur der ausdrücklich reservierte `dungeon.ahead`-/PULSE-Slot darf kreativ erscheinen. `slotForNew` beschränkt freie kreative B5-Slots auf den eigenen Abschnitt. `world.js` verwendet `refusedCreatureInThread` für nicht aufgelöste Nichtgerüchte-Threads jeder Art und behält abgewiesene vorherige Threadfassungen. | `refusedCreatureInThread` ist eine bewusst begrenzte lexikalische Kausalitäts-Heuristik (Spezies, Körperplan, Anzahl, bestimmte Tätigkeitswörter, Ausnahme für Traces/Reports). Auch andere Umschreibungen können durchkommen; erst weitere echte Fehlerfunde rechtfertigen Erweiterung. |
| **P2 Guild-Stadtorte** | `townSite` erkennt eng `<site>, <Gildenstadt>`, verweigert erkennbare Außen-, Richtungs-, Straßen-, Feld- und Wildnisbegriffe. `bookBoard` legt solche Jagdorte unter die Siedlung statt pauschal unter das Reich. Ein gleichnamiger Bestandsort bleibt über `habitatPlace` erhalten. | Namensform ist absichtlich eng und kein universeller Geocoder: andere Formulierungen städtischer Orte bleiben im Reich. Negative externe Orte sind im Test erfasst; bei späteren Userfällen auswerten statt Regel großzügig öffnen. |
| **P3 NPC `met`** | `metArrivals` kann nun das konkrete vom GO tatsächlich erreichte Ziel ohne `g.to` prüfen; `namedByStep` ist auf eine eindeutig benannte Person im selben Siedlungs-/Reichsumfang beschränkt. Bekannte Person/lebend/belegt bleiben Pflicht. | **Der natürliche Rogue-T13-Fall Witwe Hesse bleibt weiterhin abgelehnt (`met_evidence`)**. `narration_evidence.js` `HERE_DOES` kennt u. a. `stood/looked`, nicht `came`; `presentHere` bindet mehrteilige Satzbelege eng. Das ist eine fortbestehende **False-Negative**-Schwäche, nicht durch die Ortsarchitektur gelöst. Nicht pauschal jedes `came` als Anwesenheit werten. |
| **P4 Narrator-Reisezeile** | `context.js` unterscheidet angenommene Einladung/Führung ausdrücklich von unwillkürlicher erzwungener Verlagerung. Die Planner-Regel 7d und Spielerhoheit bleiben unangetastet. | Modellbefolgung bleibt bis zum natürlichen Lauf eine Hypothese. |

## Bewusst abgelehnte Änderungen – zutreffend

**Elternszene:** Die Generaltoleranz `scene = Stadt` nach Ankunft in irgendeinem Kindort hätte Personen aus einer anderen Gasse fälschlich lokal machen können. Gegenbeispiel Rogue T18 nach Stadt-Jagdort-Korrektur. Die bestehende `scene_context`-Firewall zu erhalten ist konservativ und sachlich begründet. Die eigentlichen Informationsverluste in W T12/W T20 bleiben zu beobachten.

**Attack + move:** Nach Opus' konkreter Einordnung waren fünf der sieben ursprünglichen Angriffe Konter/Lauer/Angriff ohne eigenes MOVE. Die beiden `LONG`-Fälle beinhalten eine kombinierte oder bedingte Annäherungs-/Angriffsaktion. Eine stille Teilbuchung würde den Zug und das Risiko gegenüber der gewählten Handlung ändern. Der getrennte Fachplan `FACHPLAN_KAMPF_BEWEGUNG_ANGRIFF_192.md` ist angemessen. Von seinen Varianten hat **A (klare offene Reichweitenentscheidung ohne Zugbuchung)** den geringsten Design- und Integritätsaufwand; B/C/D erst nach expliziter Designentscheidung.

## Test- und Nachweisgrenzen

- Opus dokumentiert **11 an `.191` rote, danach grüne** neue Fälle und drei dort bereits positive/Bestandsfälle.
- Die als Fortschritt gezählten `.191`-Originalnachlauf-Abweichungen sind explizit: R #13/#26 und W #24/#90/#140. Besonders wichtig ist, dass R #26 weiterhin `met_evidence` verweigert; dies ist **kein vollständiger Erfolg des natürlichen Wiedersehens**.
- Ein Historien-Replay-Fingerprint änderte sich bei `b16-rogue-sale#5`. Das entspricht derselben engen Stadtortregel, ist aber ein Ergebnis des geänderten Ortsumfangs, nicht automatisch Beweis für andere Ortsbezeichnungen.
- Die vorhandene 5-Sekunden-Runnerpause bleibt laut Tests unverändert. Es gibt **noch keinen natürlichen Spielerzug auf Build `.192`**.

## Empfehlung / nächste Spieltest-Checkpunkte

1. **Dungeon B5:** normales Weitergehen, Kampf mit hörbaren anderen Kreaturen ohne ungebuchte Feinde, erster Ebenenwechsel, später Boss.
2. **Gildenorte:** Stadtadresse vs. explizit außerstädtischer Jagdort; lokale Reise ohne Überland-PULSE und fremde Gegenproben.
3. **NPC-Besuche:** Freies Wiedersehen mit eindeutig anwesender, vorher bekannter Person bei einem Wortziel; genauer narrativer Beleg und ob `met` wirklich kanonisch wird. **Witwe-Hesse-Falschnegativ** als gezielten Prüffall behalten.
4. **Spielgefühl:** Konter bei SHORT und Sturmangriff aus LONG; irreführende `illegal`-Meldung/Leerlaufzug bewerten. Eine kleine P2-UX-Fassung von Kampffachplan A kann bei Bedarf vor dem persönlichen Test entwickelt werden, aber nicht mit automatischem MOVE vermischen.
5. **Erzähl-/Extractor-Szenen:** verbleibende Parent-Scene-Verluste als eigene Ursachen, ohne generelle Stadt-als-Zimmer-Freigabe.

**Nicht empfohlen:** weiterer vollständiger automatisierter Batch nur wegen der neuen Patches, pauschale Szenenlockerung, neue A2/B5-Architektur oder Zusammenlegung von Planner/Narrator/Extractor. Der nächste Erkenntnisgewinn kommt von einem persönlichen Spieltest bzw. enger Mechanikprüfung der noch nicht natürlich abgedeckten B5-Ebenen und Kampfentscheidungen.
