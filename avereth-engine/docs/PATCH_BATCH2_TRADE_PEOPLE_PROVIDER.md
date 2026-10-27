# Batch 2 – Handel, NPC-Wiederbegegnungen und Narrator-Recovery

Build **4.3.0-c.6.6.102**, Basis `8189b87` (.101). Drei zusammengehörige Fehlerkorrekturen aus dem Batch `20261027-073917Z`, dazu die ausdrücklich gewünschte Verkürzung auf drei Guild-Kampagnen. Keine Änderungen an XP, Balance, Skills, Spielerstrategie oder Narrator-Vertrag (.85).

## Prüfgrundlage und Gegenreview

Originalexport unabhängig geprüft: ZIP-CRC fehlerfrei, SHA-256 `8991e08d32486997b94421584a03bcb0ecd361eabc8e36329f1197c36170a59c`. Die ersten fünf Läufe sind auswertbar; Lauf sechs wurde vom Nutzer abgebrochen und zählt nicht als technischer Ausfall. [GPT-Review auf main](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/batch-20261027-073917Z/REVIEW.md). Das anschließend übermittelte Gegenreview bestätigt die Handelsbefunde und präzisiert die NPC-Orte; diese Präzisierung ist übernommen.

Brenna war zuletzt bei `loc.milbrook.mill_house`, nicht auf Hedrics Weide. Corlin (`npc.npcraftcamp_aproned`) war zuletzt bei `loc.corlins_ford`, nicht am Raft-Camp. Eine Spielerankunft allein darf beide deshalb nicht dorthin versetzen. Es gibt keine automatische Umwandlung von `person.new` in eine Bewegung an einen beliebigen Ort.

## 1. Handelsrichtung, Warenlose und Preisnachweise

- `world.bid()` ersetzt nur frühere Gebote desselben Käufers mit überschneidenden Objekt-IDs. Unabhängige Lose bleiben offen. Bei teilweiser Überschneidung wird das **gesamte alte Los** geschlossen; sein gemeinsamer Preis wird nicht erfunden oder aufgeteilt.
- `trade.saleOfferLines()` erkennt einen aktuellen Verkauf anhand der bereits vorhandenen Entscheidungen, des Zuges, Ortes und Gegenstandsbesitzes. Im reinen Verkaufsgespräch dürfen Warenpreise desselben Gegenübers kein PC-Kaufangebot erzeugen. Das hängt nicht von identischer Warenbenennung ab. Eine zusätzliche aktuelle Kaufanfrage erlaubt weiterhin passende Kaufangebote; Dienstleistungen und andere Verkäufer bleiben unberührt. Bewusste Grenze: ein unverlangtes Waren-Zusatzangebot im laufenden Verkauf wartet auf einen eigenen Kaufwunsch.
- Derselbe Richtungscheck läuft in der Extractor-Prüfung vor dem bestehenden Repair sowie verbindlich beim World-Commit. Ein falsches `offer` wird nicht automatisch zum `bid`: der Repair muss Käufer, konkrete gehaltene Objekt-IDs, Menge und echten Preis liefern. Kein Geld und keine Gegenstände werden aus einer bloßen Korrektur erzeugt.
- `coinEvidence()` versteht „one silver eight“ beziehungsweise „1 silver 8“ als 18 Kupfer. Mehrdeutige Zahlensuffixe werden als unklar abgewiesen, statt still auf den ersten Betrag reduziert. Ausgeschriebene Währungen und Einheitspreise wie „a copper a plate“ bleiben gültig.
- Nicht aus dem Spielertext kopierte `party_words` zählen ebenfalls als Handelskonflikt. Nach den vorhandenen zwei Planner-Versuchen kann ein ansonsten schemafähiger, ausschließlich widersprüchlicher Handelsplan den bestehenden CLARIFY-Pfad verwenden. Kein ungültiger Kauf wird ausgeführt und keine zusätzliche Planner-Anfrage eingeführt.

Belegt durch C386 (60- und 10-Kupfer-Gebote), C394/T122 (Verkauf fälschlich als Kauf, tatsächlicher falscher Abzug von 20 Kupfer) und T123 (beide Original-Plannerantworten). Bereits falsch gebuchte historische Käufe werden nicht rückwirkend umgeschrieben.

## 2. Bekannte NPCs und tatsächliche Anwesenheit

- Eine bekannte, lebende Person am **gespeicherten aktuellen Ort** darf mit ihrer bestehenden Identität wiederbeobachtet werden. Es entstehen keine neue Figur oder erneuerte historische Eigenschaften.
- Eine bekannte abwesende Person, die per `person.new` an einem anderen Ort eingeführt wird, führt im Extractor zum bestehenden Repair mit konkreter ID und letztem Ort. Tatsächliche neue lokale Ankünfte werden als `enter` gemeldet; entfernte Erwähnungen bleiben `present:false`. Der World-Pfad weist die unbelegte Neuanlage weiterhin zurück.
- Ein akzeptiertes `enter` schreibt auch den kanonischen NPC-Ort sofort fort. Szenenzuordnung, erreichte Schauplätze, tote Figuren und bestehende Kontinuitätssperren bleiben verbindlich. Eigenständige NPC-Ankünfte benötigen keinen Spieler-GO.
- Fakten und Erinnerungen bleiben an derselben ID. Keine neue NPC-Reisesimulation, Namensähnlichkeits-Verschmelzung oder Prosa-Bewegungsheuristik.

Grenze: `enter` ist weiterhin der bestehende strukturierte Bericht über ein tatsächlich aktuelles NPC-Ereignis. Ob eine beliebige erfundene Reisegeschichte plausibel ist, kann die Engine nicht allgemein beweisen. Der Fix verbessert Fehlerhinweis, Identität und Ort; er garantiert nicht, dass jedes LLM-Repair den richtigen Sachverhalt liefert.

## 3. Einmalige Recovery bei explizitem Narrator-Serverfehler

Der Explore-Warrior erhielt bei T87/C285 HTTP 200 mit `error.code: internal_server_error`. Das ist kein gewöhnlicher leerer Story-Reply. ST 1.19 bietet dafür keinen strukturierten Generation-Fehler-Event: sein Chat-Completion-Request wirft vor einer neuen Antwortnachricht.

`index.js` erfasst deshalb beim bestehenden `CHAT_COMPLETION_SETTINGS_READY` genau den nichtstreamenden Einzelchat-Narratorrequest mit Engineblock. Ein eng begrenzter Fetch-Observer wiederholt **denselben ausgehenden Request innerhalb derselben ST-Generation**, ausschließlich bei HTTP 429/500/502/503/504 oder einer erfolgreichen HTTP-Antwort mit explizitem transientem Serverfehler. Andere Requests laufen unverändert durch. Permanente 4xx, Netzwerk-Ausnahmen und Benutzerabbrüche lösen diese Wiederholung nicht aus; Streaming und andere ST-API-Routen sind nicht erweitert.

`narratorProviderResponse()` nutzt denselben persistenten Einmaligkeitsmarker wie die vorhandene Leerantwort-Regeneration. Vor und nach dem Speichern werden Chat-ID/-Referenz, Auftragszähler, Nachricht, Eingabetext, Record-Identität, Nachrichtenanzahl und AbortSignal geprüft. Nach verbrauchter Recovery gibt es keinen dritten Versuch. Der Enginezug, seine Würfel, Käufe und Weltzustände werden nicht erneut berechnet. Es werden keine Zugangsdaten im Recovery-Marker gespeichert.

## 4. Drei Guild-Läufe

`live:st:batch` startet nur **Guild-Warrior → Guild-Mage → Guild-Rogue**. Seeds bleiben Startseed/+1/+2, mit getrennten nummerierten Ordnern und unverändertem Export/IPC-Abbruch. Explore-Profile sind nur noch auf ausdrücklichen Wunsch als Einzellauf erreichbar. Bestehende Guild-Spieleranweisungen, Level-15-Ziel und Limits bleiben bestehen. `--list` zeigt exakt drei Guildprofile; Startbefehle bleiben gleich. Einen bereits laufenden Batch vor dem Aktualisieren beenden lassen.

## Abnahme

- **29 neue Fachprüfungen:** unverändertes `.101` **25 rot / 4 grüne Kontrollen**; `.102` **29/29 grün**. Die Fixture enthält relevante Originalzustände/-antworten einschließlich der beiden NPC-Ortsketten und T119–123; nur fremde Erinnerungen, Threads, Wissen und für diese Fälle irrelevante Fakten sind gekürzt.
- Gegenproben: getrennte/überlappende Gebote, echte Käufe und ausdrücklicher Kauf während eines Verkaufs, abweichende Warenwörter, unveränderte Stückpreise, einmaliger Verkauf, CLARIFY ohne Ausführung, gleicher/falscher NPC-Ort, Tod, ausdrückliche autonome Ankunft, erhaltene Geschichte und serialisierter Event-Replay. Bestehende Brast-/Handels-/Legacy-Regressionen bleiben grün.
- **Vollständiges `npm test`: 2.024/2.024**, keine übersprungenen Tests.
- **Echter ST-1.19-Smoke mit Mockprovider:** ursprünglicher HTTP-200-Serverfehler **23/23**, vorhandene Leerantwort-Recovery einschließlich verzögertem Speichern **24/24**. Je fünf Extractor-Aufrufe, `extractPerReply` und `fightOpened` grün, keine PageErrors. Der Providerfehler erzeugt zwei Narratorrequests, aber nur einen Enginezug. Die nach Abschluss gespeicherten vier Story-Records sind jeweils `applied` mit genau einem `extract.applied`. Dies ist technische Host-Abnahme, kein natürlicher GLM-Langlauf.
- **Echter ST-1.19-Stub-Batch: 3/3 Kampagnen**, jeweils absichtlich auf zwei gewöhnliche Erstellungseingaben begrenzt. Warrior/Mage/Rogue stimmen mit dem Enginezustand überein, Seeds 40/41/42, getrennte Exporte, keine PageErrors, Profiländerungen oder Geheimnistreffer. Alle enden korrekt als `limit`; kein natürlicher Level-15-Nachweis. Die erste lokale Probe verwendete versehentlich den Standardguide statt `current_test` und wurde vor der Erstellung abgewiesen; mit richtigem Guide bestanden alle drei Läufe. Die Batch-/IPC-/Exportregressionen und `--list` prüfen ebenfalls exakt drei automatische Guildprofile.

Extractor-Prüfung `extract-5.14`; Vokabular, Eventtypen und Narrator-Kartenrevision unverändert. Neuer natürlicher Guild-Batch ist der nächste Wirksamkeitsnachweis; Balance lässt sich aus den technischen Smokes nicht ableiten.
