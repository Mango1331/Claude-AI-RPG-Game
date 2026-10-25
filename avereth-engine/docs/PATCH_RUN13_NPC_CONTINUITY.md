# Run 13 – NPC-Identität und gezielter Rückruf (.85)

## Unabhängiger Befund

Basis .83 / b70bd1f; Guild-Paket .84 ist fachlich getrennt. Quelle: unveränderter Run-13-Export und beide archivierten Reviews. E140 führt Brast ein; E144 löst seine Fesseln, E148–152 begleiten ihn nach Glassmere, E154 bucht seinen Abgang. Vor E176 sind `bindings: freed`, sein gehfähiger Zustand und der Heimwegplan gespeichert. E176 meldet dennoch `person.new npc.brast` als seit drei Tagen Eingeklemmten. Der V3-Adapter verwendet die alte Person und erzeugt lokale Anwesenheit; ein späteres funktionales Statusfaktum überschreibt die bisherige Lage. E196 erzeugt mit neuem Ref und erweitertem Namen tatsächlich eine zweite Entity.

Die Kontextlücke ist ebenfalls belegt: Abwesende NPC-Karten werden überwiegend über Namen im aktuellen Text ausgewählt und können aus dem Budget fallen. Beim erneuten Steinbruchbesuch wird Brast nicht genannt. Die allgemeine Erinnerungssuche ersetzt keinen gezielten Rückruf seiner aktuellen Fakten. `entity.at` bedeutet dabei nicht „letzter historischer Aufenthalt“: Ein ausdrücklicher Abgang entfernt gerade die Annahme, dass jemand dort wartet. Diese Semantik bleibt erhalten.

## Kleine Fachkorrektur

- `npcContinuity` in `knowledge.js` wählt höchstens drei bekannte abwesende Personen nach ausdrücklicher Nennung oder ihren bezeugten Erinnerungen an das aktuelle Gebiet aus. Narrator und Extractor erhalten dieselben Identitäten, öffentliche aktuelle Zustands-/Bindungs-/Plan-/Wohnortfakten sowie historischen letzten Sichtungsort und eine relevante Erinnerung. Die Narrator-Sektion bleibt bei knappem Budget erhalten und ist ausdrücklich **keine Anwesenheitsbehauptung und kein NPC-Wissenstransfer**.
- Im C-Pfad von Ruleset 2 führt `person.new` bekannte abwesende Menschen nicht mehr still wieder ein. Bestehende lokale Personen und entfernte Erwähnungen bleiben dieselben; eine tatsächliche Rückkehr verwendet das vorhandene `enter`. Dafür braucht es weder Alarics GO noch eine Reisegenehmigung oder einen neuen Bewegungszustand.
- Eine möglicherweise identische Person mit erweitertem Namen wird nicht automatisch verschmolzen oder dupliziert. `person.named` mit bestehender ID übernimmt die Namenserweiterung. Nur eine ausdrücklich andere Person darf über das nullable Extraktionsfeld `distinct_from` von der kollidierenden Identität unterschieden werden. Andere ähnliche Namen ohne Erweiterungskollision bleiben gewöhnliche Neuankömmlinge.
- Bei abgewiesener Wiedereinführung werden unmittelbar abhängige Personenbehauptungen, Erinnerungen und Threads dieser Antwort ebenfalls verworfen. Die Korrektur erreicht den nächsten Narrator-Kontext. Die Sperre ist nur antwortlokal, kein persistentes NPC-Verbot. Ein tatsächliches `enter` verwendet die bestehenden Autoritäts-/Ortsprüfungen.

Kein neues Event, keine NPC-Reisesimulation, kein Identitätsgraph und keine Save-Migration. Alte Records werden weiter gefaltet; beschädigte alte Verläufe werden nicht automatisch umgeschrieben. Regeln zur Player Agency, Szene, Ankunft, Gilde, freier Hilfe und Geschenken bleiben bestehen.

## Schnittstelle

Extractor `extract-5.6`, Vokabular `delta-1.5` mit nullable `person.new.distinct_from`. Alte Antworten ohne Feld bleiben durch die vorhandenen Soft-Defaults lesbar. Historische Privatquest-Vokabularvarianten bleiben funktional erhalten; das gemeinsame Personenfeld und die Kontinuitätsanweisung gelten auch dort. Keine Providerbudgets oder zusätzlichen LLM-Aufrufe.

**Narrator-Vertrag Revision .85**: Persönliche SillyTavern-Karte vor dem nächsten eigenen Lauf aktualisieren. Der isolierte ST-Smoke verwendet die Vertragsdatei selbst. Neue Kampagnen behalten die .83-Entscheidung: nur Gildenquests formal; freie Hilfe, tatsächliche Geschenke und Dankeszahlungen bleiben möglich.

## Tests und Grenzen

`patch_run13_people.test.js`: 13 Regressionen. Abschließender Lauf gegen unverändertes .83: **sechs rot, sieben grüne Kontrollen**. Original E176 und E196 scheitern dort, die originale Einführung/erste Rettung bleibt gültig. Nach Fix 13/13 grün. Gegenproben: autonome Rückkehr samt neuer Notlage ohne PC-GO, voller Name mit bestehender ID, ausdrücklich verschiedene Personen, andere ähnliche Namen, gewöhnliche Neuankömmlinge, entfernte Erwähnung, Abgang/Rückkehr, abhängige falsche Erinnerungen/Threads, JSON-Reload/Event-Replay und alternative Antwort aus demselben Vorzustand. Die Original-Extractorantworten wurden nicht nachträglich annotiert; neue Protokollfälle sind gesonderte Testdaten.

Zusammen mit Guild-, World-, Kontext- und Free-Help-Nachbarn: 56/56. Abschließendes `npm test`: **1665/1665 grün**. Echter `npm run smoke:st:c` in SillyTavern 1.19: **21/21**, fünf Extractor-Aufrufe, keine PageErrors; vier gespeicherte Story-Records jeweils `applied` und genau ein `extract.applied`. Die Guild-Negativkontrolle wurde isoliert, damit eine vorgeschaltete alte Dungeonbegrenzung nicht die erwartete Rangfehler-Meldung verdeckt; sämtliche 11 Guild-Tests auf .83 ergeben drei rot/acht grün.

**Bewusste Grenze:** JavaScript beweist keine beliebige erzählerische Kausalität. Eine vom Modell ausdrücklich als neuer Eintritt behauptete, aber inhaltlich unglaubwürdige Wiederholung kann weiterhin falsch erzählt werden. Der Patch schützt den nachgewiesenen stillen Wiedereinführungspfad und liefert die fehlende Vorgeschichte; er führt keine Textheuristik für jede denkbare Rettung ein. Namenserweiterungen ohne eindeutige Zuordnung werden zurückgewiesen statt geraten. Der echte ST-Smoke nutzt einen Mock-Provider und belegt Hostintegration, nicht natürliche GLM-Semantik. Kein neuer natürlicher Langlauf gestartet.
