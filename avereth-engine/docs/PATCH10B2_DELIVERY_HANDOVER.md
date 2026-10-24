# Patch 10B-2 — Freiwillige Übergaben und verlässliche Liefererfüllung

**Build:** 4.3.0-c.6.6.59. **Basis:** e6c76b4aada6fbb0d2ba18a48a2ed623afa53d7d (.58). Umsetzung durch Codex am 24.10.2026. Unabhängiges Code-/Notes-Review und echter Modell-Livetest stehen aus.

## Ausgangsfehler und Ziel

Run 3 E14 speicherte READY vor der verspäteten Kistenaufnahme; E28/E32 verweigerten Transfers, während E32 dennoch READY setzen konnte. E37 ließ die Kiste auf dem Gildenboden; E39 akzeptierte anschließend den bloßen Besitzverlust plus Story-READY als Lieferung. Das negative Holder-Gate ist für neue C-Kampagnen durch positiven Nachweis ersetzt. Keine zusätzliche Quittung, Unterschrift oder Pflicht-Spielernachricht.

## Tatsächliche Änderungen

- Neues enges Fachmodul `src/v4/delivery.js`: Prüfung passender Fracht, vereinbartem Ziel, anwesendem Empfänger und Mengen; strukturierte Lieferbelege. Ortsnamen werden gegen etablierte Orte aufgelöst (spezifischster Name, bei gleichnamigen Orten eindeutiger aktueller Vorfahr); Empfänger anhand expliziten Namens oder etablierter Rolle. Widersprüchliche/fehlende Identitäten werden nicht durch erfundene Empfänger ersetzt. Gildenvertragsscheine sind keine Fracht.
- `commands.js`: Direktes GIVE verwendet den vorhandenen Transferpfad mit Split und Provenienz. Direktes GIVE/DROP von Sheet-Inventaritems materialisiert wie bisher ein Weltobjekt und kann nun ebenfalls den Nachweis erzeugen. Nach GO bewahrt das bedingte GIVE Menge, Objekt, Empfängerreferenz und Zielort; auch Sheet-Items werden unterstützt. Ein späteres GO kann die offene Übergabe nicht überholen.
- `world.js`: Bedingtes GIVE wird nur nach bestätigter Ankunft und bestätigtem tatsächlichem Transfer zum richtigen anwesenden Empfänger gebucht. Für Sheet-Items wird der bestehende GIVE-Handler wiederverwendet. Bloße Anwesenheit nach Ankunft erzwingt keine Annahme gegen eine Verweigerung des NPC. Ein passender object.move-Report und die ursprüngliche Spielerautorisierung sind nötig, kein zusätzlicher LLM-Aufruf. Unbekannte Empfängerreferenzen werden exakt gegen aktuelle Namen/Rollen aufgelöst; Ladeninhaber und Assistent sind nicht gleichgesetzt.
- Lieferbezogene READY-Claims werden ausschließlich in Ruleset 2/C nach den relevanten Objektbuchungen und `expected.taken` geprüft. Die Entscheidung beruht auf tatsächlichen Belegen und erfasst dadurch auch handlerseitig gescheiterte Transfers. Andere Questarten und Legacy-Claims behalten ihren bisherigen Verarbeitungszeitpunkt.
- `guild.js`: `contractReady`, und damit Turn-in, Slip-Markierungen und READY-Anzeige, verlangen ausreichend belegte Liefermengen. Bereits belegte Lieferung wird nicht durch später zurückgetragene Verpackung widerrufen. Eigenständige Sammelware bleibt eigenständig erforderlich. Die vorhandene Unterscheidung reiner Bestätigungs-/Nachrichtenobjectives wurde ohne Semantikänderung ins Fachmodul ausgelagert.
- `planner.js`: Wirkliche Abgabe auf dem Empfängertresen von Begutachtung unterscheiden; die Cargo-Ausnahme des deterministischen SHOW-Filters gilt nur am passenden Lieferziel. Keine allgemeine Umdeutung von Marktware in eine Gabe.
- `context.js`: In Ruleset 2 erklärt der autoritative Questkontext den realen Warenübergang und unveränderte Vertragsbedingungen. `world.js` verweigert zusätzliche containerbezogene Rückgabepflichten in Guild-Liefernotizen, wenn sie nicht Teil des ursprünglichen Vertrags sind. Keine allgemeine semantische Wahrheitserkennung behauptet; beliebige freie Prosa wird dadurch nicht garantiert fehlerfrei.
- `domain.js` und `ownership.js`: neuer reiner Engine-Event `quest.delivered`, eigener Engine-owned Zustandstyp `quest.delivery`. Kein gleichnamiges Extractor-Delta, keine neue Planneraktion und kein neues Quest-/Routing-System.

## Event, Autorisierung und Replay

`quest.delivered {id, receipt}` speichert den Auftrag über `id`, eine stabile Objective-Zuordnung sowie `object`, `origin`, `qty`, `to`, `at`, `turn`, `seq` und einen deterministischen `key`. Die Frachtprovenienz (`delivery_origin`, `delivery_capacity`) bleibt bei Splits erhalten. Belegte Mengen sind begrenzt; Zurücknehmen und erneutes Abgeben derselben Einheiten erhöht den Fortschritt nicht beliebig. Eine Bewegung wird nicht mehreren Verträgen gleichzeitig gutgeschrieben. Der Reducer dedupliziert Belegschlüssel und verändert keine abgeschlossenen Quests.

Der separate Event wurde gewählt, weil `quest.progressed` bereits aus Story-Progress erzeugt wird: ein Engine-Nachweis soll dort nicht als beliebiges Extractor-Zusatzfeld eingeschleust werden können. Der neue Ownership-Gate bei object.move öffnet nur nach validierter ursprünglicher GIVE-Autorisierung. Die allgemeine PC-Inventar-Firewall bleibt unverändert.

## Alte Saves und begrenzte Bestätigung

Alte Events werden nicht umgeschrieben. Ruleset 1 und V4-A behalten ihre Proof-Semantik; der positive Liefernachweis gilt für Ruleset 2/C. Alte abgeschlossene Aufträge bleiben abgeschlossen.

Ein alter aktiver Auftrag wird nicht aus ready_note oder Chit umetikettiert. Falls die wirklichen Waren schon nachweislich vom PC zum ursprünglichen Empfänger gelangt sind (`had_pc`, aktueller Holder, ausreichende Menge, ursprünglicher Zielort), kann der Spieler dort die Lieferung explizit bestätigen lassen. Nötig ist eine tatsächlich aufgelöste `other`-Spielerhandlung mit wörtlicher Evidenz im Input; der READY-Claim allein reicht nicht. Diese Bestätigung belegt den jetzigen physischen Empfang, erfindet keinen historischen Transfer. Sie ist atomar: fehlen Mengen oder Objectives, entstehen keine halben Bestätigungen. Ein wiederholter Claim erzeugt keine zweite Gutschrift. Das ist kein zusätzlicher Pflichtschritt für neue Lieferungen.

## Tatsächlich ausgeführte Tests

`tests/v4/patch10b2.test.js`: **27/27 grün**. Finaler Rotlauf mit den unveränderten .58-Produktmodulen: **6 grün, 21 rot**. Grüne Kontrollfälle werden nicht künstlich rot gemacht.

D1–D12 sind abgedeckt: verspätete Aufnahme, direkte/bedingte Übergabe, Mengen/Splits und Sheet-Items, positive Belege, handlerseitige Ablehnung und NPC-Verweigerung, falscher Ort/Empfänger/toter Empfänger, Gildenboden, erlaubte Ablage, zwei Ziele und unabhängige Sammelware, zurückgenommene Einheiten, SHOW-vs-GIVE, GO-GIVE-GO, alte Daten/Bestätigung, Event-Replay und tatsächlicher Host-Swipe/JSON-Reload. Quest-Progress kann keinen Lieferbeleg erzeugen. Die vorhandene Ownership-Tabellenerwartung wurde um den neuen Engine-Zustand ergänzt.

`fixtures/10b2_original_deliveries.json` enthält gefilterte autoritative Vorzustände und die unveränderten ursprünglichen GIVE-Kommandos aus **Run 1 vor E31** und **Run 2 vor E27**; beide erzeugen mit dem Patch einen echten Nachweis und erfüllen die gemeinsame Turn-in-Prüfung. Keine erfundenen Ersatzverträge als alleiniger Kompatibilitätsbeleg. Nicht benötigte Erinnerungen, Angebote und Fakten wurden aus diesen Testfixtures entfernt; Original-ZIPs/Reviews bleiben unverändert.

Angrenzende V4-/Agency-Suiten auf Zwischenstand: **883/883 grün**. Nach zusätzlichen negativen Fällen abschließende vollständige Suite **1313/1313 grün** (npm test; vorherige vollständige Kontrollstände 1310/1310, 1311/1311, 1312/1312). Zusätzliche Gesamtläufe waren nach neu entdeckten Randfällen/Codekorrekturen erforderlich; nicht als unabhängige Reviews ausgeben.

**npm run smoke:st:c: ausgeführt, aber BLOCKIERT/Exit 1**, bereits vor Browser-/Hoststart: `Error: set AVERETH_ST_DIR to a SillyTavern checkout`. In dieser Umgebung ist kein ST-Checkout vorhanden. Kein erfolgreicher Smoke, kein AbortReason-Befund und kein echter GLM-Run behauptet. Der vollständige ST-Smoke muss im verfügbaren lokalen ST-Setup nachgeholt werden.

## Grenzen und Gegenreview

Textuelle Orts-/Rollenauflösung bleibt bewusst konservativ, keine neue globale Identitätsdatenbank oder semantische KI-Prüfung. Nicht eindeutig auflösbare Ziele und nicht tatsächlich berichtete/akzeptierte bedingte Übergaben bleiben offen; NPC-Präsenz wird nicht automatisch erzeugt. Eine SHOW-/Preisprüfung ändert keinen Besitz. Allgemeine Narrator-Wahrheit und neue optionale Vertragsabsprachen sind kein Teil dieses Patches.

Buildnummern in util.js, manifest.json und package.json synchron .59; Narrator-Kartenvertrag .55 unverändert (Änderung des dynamischen Enginekontexts, kein neuer Kartenvertrag). Kein Runner-/Guide-/Provider-/Balance-/Monster-/Chase-Fix. 10B-3 nicht begonnen. Nach Commit: unabhängiges Code- und Notes-Gegenreview, danach Host-Smoke und echte Live-Abnahme.

