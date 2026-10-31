# Architekturpatch D – strukturierte Gearangebote (.133)

Basis: `a42d02327f95650088eb692c65e61564820ac35a` (.132). Umsetzung von Paket D aus dem finalen Architekturfachplan auf main. **Implementiert; Node-/Replayabnahme unten. Echte ST-Abnahme blockiert, keine Livefreigabe.** B2/E und natürlicher Batch nicht begonnen.

## Verhalten und technische Änderungen

- `items.gearBases/gearOfferProfile/gearOfferName`: stabile Artikel-IDs aus den vorhandenen Content-Kategorien/Wörtern, dazu explizite Qualitätsstufe. Keine neuen Slots, Zahlenwerte oder Qualitätsstufen. Bogen/Schwert/Fokus bleiben über ihre unterstützte Vorlage unterscheidbar. Das bestehende Profil-/Preismodell berechnet weiterhin sämtliche Werte.
- `extract.js`, `deltas.json`, Gear-Market-Katalog: `base` und `quality` an Angebotszeilen; nullable Transportfelder, aber erforderlich für neue reguläre F-Gearartikel. Unbekannte/fehlende Kombination wird lokal abgewiesen, keine Namensfallback-Aufwertung. Extractor `5.22`, Delta `1.12`; Narrator-Vertrag unverändert, kein Kartenupdate.
- `world.offerLines`: zuerst den regulären Artikel bestimmen und Enginepreis einsetzen. Eine fehlende/abweichende Prosasumme blockiert nicht allein die Offerte. Dienste, flexible Waren, E+-Waren, Verkäufe/Geschenke und ihre Preisbelege bleiben erhalten. Bestehende identisch wiederholte Angebote werden nicht umgewertet.
- Verbindliche Angebots-/Objektnamen zeigen Qualität, Rang und konkrete Artikelvorlage. Der freie Narratorname bleibt `appearance`; er liefert weder Stats noch Kaufidentität. Eine Rüstungszeile mit einer Schwert+Rüstungsbeschreibung bleibt sichtbar nur eine Rüstung. Ein vollständiger Paketkauf verlangt tatsächlich passende getrennte Zeilen; der bestehende `purchaseLines`-Abgleich prüft die Komponenten. Keine zusätzliche allgemeine Paket-Prosaheuristik.
- Vorhandene Artikelgleichheit für Gear auf eindeutige Artikelnamen begrenzt: ein gemeinsames Wort wie „sword“ schließt nicht mehr andere Qualitätsangebote. Flexible Waren behalten ihren vorhandenen Abgleich. Fachhändlerstock nutzt denselben Vorlagen-/Preisweg.
- Bestehende `pickLines/bookPurchase`, Mengen, Profile, Verkäufer-/Ortsprüfung und atomare Mehrzeilenbuchung bleiben. Geldgrenze auch bei `any_price` verbindlich. Bei neuem/unbekanntem Enginepreis genügt passende vorherige Zustimmung mit ausreichendem `max_cp`; kein zusätzlicher Pflichtzug. `any_price` allein darf den geänderten Preis nicht automatisch bezahlen. Ohne Geld/Ankunft/Verkäufer oder bei unvollständigem Paket kein Kauf.
- Vorhandene unterstützte .132-Kampagnen und ihre gespeicherten Angebote bleiben nutzbar; kein weiterer Kampagnen-Mindestbuild und keine neue Migration. Aktuelle Replay-/Reload-/Swipepfade bleiben erhalten.

## Tests und Reproduzierbarkeit

- `tests/v4/d133_gear.test.js`: **21 Regressionen; auf unverändertem a42d023 elf rot / zehn positive Kontrollen**, danach **21/21 grün**. Testdatei auf einer separaten unveränderten .132-Arbeitskopie ausgeführt; kein Produktcode dort angepasst.
- Matrix: fehlende/ungültige Vorlage/Qualität, freier Name, fehlende Preisprosa, Limit unter/gleich/über Preis, `any_price` mit/ohne Limit, vollständiges/unvollständiges Paket, Mengen, Zahlungsfähigkeit, Abwesenheit, Wiederholung, bestehender Vertrag, atomare Buchung und JSON-Event-Replay. Die bestehenden Buy→Equip-/Besitz-/Reload- und Handelsregressionen bleiben.
- Angrenzende fünf Gear-/Handelssuiten: **104/104**. Zwei alte .123-Assertions „jeder korrigierte Preis verlangt neuen Zug“ wurden durch die neue explizite Limitmatrix ersetzt; der vorhandene Pakettest erwartet jetzt die vollständig autorisierte atomare Buchung. Keine Sicherheitsprüfung entfernt, um einen Defekt zu verdecken.
- Historische Fixtures erhalten nur im Test-/Replayadapter `tools/replay/contract_d.mjs` eine dokumentierte Konvertierung aus der damaligen Artikel-/Qualitätslesung. Ein altes Paket wird dabei ausdrücklich nicht nachträglich in zwei Waren aufgeteilt. `contract_c.mjs` wendet sie auch auf reine Angebotsantworten an. Originalexporte bleiben unverändert; Produktcode importiert keinen Adapter.
- Vor D: vollständiger .132-Korpus gegen .126-Baseline und ursprüngliche C-Fingerprints geprüft: **2.235 Fälle, 142 exakt akzeptierte Abweichungen, null offen/stale**.
- D: `accepted_d133_vs_126.json` übernimmt die **142 C-Einträge samt Fingerprint und Grund unverändert** und ergänzt die unten einzeln aufgeführten **48 D-Records** mit vollständigen Output-Fingerprints. `npm run replay:check` nutzt diese Liste. Die ursprüngliche C-Datei und .126-Baseline bleiben unverändert. Ein zusätzlicher Test prüft die unveränderte Übernahme; Geld-/Quest-/Eventmutationen in akzeptierten Records werden weiter erkannt.
- Gesamte Node-Suite und abschließender unabhängiger Replayvergleich: siehe Abschluss unten.

## Echte SillyTavern-Abnahme: blockiert

Standard `npm run smoke:st:c` und Failsoft-Variante mit der vorhandenen ST-Installation `/workspace/scratch/f22261d02397/st124` versucht. Beide scheitern vor dem Szenario an fehlendem Playwright-Chromium/Headless-Shell. Nachinstallation für installierte und aktuelle Playwright-Version versucht; die CDN-Downloads liefern leere/beschädigte ZIP-Dateien („End of central directory record signature not found“).

**Keine erfolgreiche .133-ST-Abnahme, keine belegte Extractor-Aufrufzahl, keine Aussage über bestandene PageError-/Save-/Swipe-Smokechecks.** Der frühere .132-Smoke gilt nicht für .133. Vor natürlichem Batch Standard und Failsoft mit verfügbarem Browser nachholen. Keine Produktänderung zum Umgehen dieser Abnahme.

## Einzelne Replayabweichungen

Alle 48 zusätzlichen Records wurden auf Originalvorzuständen verarbeitet; es entstehen darin keine neuen Coin-Buchungen. Angebotsrepräsentation/-preise und Ablehnungsdaten ändern sich. Ein Original-Vorzustandsreplay simuliert nicht die spätere Spielerreaktion auf die neue Anzeige; neue Kaufkombinationen prüft die Regressionsmatrix. Derselbe Output ist nur mit exakt passendem Fingerprint akzeptiert; eine Record-ID allein ist keine Freigabe.

| Record | Beabsichtigte Änderung | Zusätzliche Geldbuchung |
|---|---|---|
| b17-mage#6 | Neue nullable Gearfelder in bereits abgewiesener Angebotszeile; fachliche Ablehnung unverändert | keine neue |
| b17-mage#176 | Neue nullable Gearfelder in bereits abgewiesener Angebotszeile; fachliche Ablehnung unverändert | keine neue |
| b17-rogue#8 | Neue nullable Gearfelder in bereits abgewiesener Angebotszeile; fachliche Ablehnung unverändert | keine neue |
| b17-warrior#22 | fine F-Rank breastplate → 72 cp; superior F-Rank breastplate → 88 cp; fine F-Rank longsword → 140 cp; superior F-Rank longsword → 260 cp | keine neue |
| b17-warrior#118 | fine F-Rank longsword → 140 cp; superior F-Rank longsword → 260 cp; fine F-Rank plate armor → 72 cp; superior F-Rank plate armor → 88 cp; fine F-Rank sword → 140 cp; superior F-Rank sword → 260 cp; exceptional F-Rank sword → 480 cp | keine neue |
| b17-warrior#142 | exceptional F-Rank longsword → 480 cp; edge true'd and straps tightened on his own gear → 8 cp | keine neue |
| b17-warrior#222 | exceptional F-Rank longsword → 480 cp; superior F-Rank cuirass → 88 cp; exceptional F-Rank longsword → 480 cp | keine neue |
| b17-warrior#258 | exceptional F-Rank longsword → 480 cp; superior F-Rank plate armor → 88 cp; exceptional F-Rank plate armor → 104 cp | keine neue |
| b17-warrior#266 | Neue nullable Gearfelder in bereits abgewiesener Angebotszeile; fachliche Ablehnung unverändert | keine neue |
| b17-warrior#300 | exceptional F-Rank longsword → 480 cp | keine neue |
| b17-warrior#302 | superior F-Rank plate armor → 88 cp | keine neue |
| b18-rogue#8 | Neue nullable Gearfelder in bereits abgewiesener Angebotszeile; fachliche Ablehnung unverändert | keine neue |
| b18-rogue#36 | common F-Rank sword → 80 cp; fine F-Rank sword → 140 cp; fine F-Rank dagger → 140 cp; common F-Rank light armor → 48 cp; fine F-Rank light armor → 56 cp | keine neue |
| b18-rogue#130 | Neue nullable Gearfelder in bereits abgewiesener Angebotszeile; fachliche Ablehnung unverändert | keine neue |
| b18-rogue#200 | common F-Rank knife → 80 cp; common F-Rank knife → 160 cp | keine neue |
| b18-rogue#264 | fine F-Rank leathers → 56 cp | keine neue |
| b18-rogue#266 | fine F-Rank leathers → 56 cp | keine neue |
| b18-rogue#268 | Neue nullable Gearfelder in bereits abgewiesener Angebotszeile; fachliche Ablehnung unverändert | keine neue |
| b18-rogue#338 | Neue nullable Gearfelder in bereits abgewiesener Angebotszeile; fachliche Ablehnung unverändert | keine neue |
| b18-warrior#6 | Neue nullable Gearfelder in bereits abgewiesener Angebotszeile; fachliche Ablehnung unverändert | keine neue |
| b18-warrior#38 | common F-Rank longsword → 80 cp; fine F-Rank longsword → 140 cp; superior F-Rank longsword → 260 cp; common F-Rank plate armor → 64 cp; fine F-Rank plate armor → 72 cp; F-Rank Banded Water Serpent Fang → None cp | keine neue |
| b18-warrior#170 | fine F-Rank longsword → 140 cp; superior F-Rank longsword → 260 cp; fine F-Rank plate armor → 72 cp; common F-Rank shield → 56 cp; common F-Rank buckler → 56 cp; fine F-Rank sword → 140 cp; superior F-Rank sword → 260 cp; exceptional F-Rank sword → 480 cp | keine neue |
| b18-warrior#172 | fine F-Rank plate armor → 72 cp | keine neue |
| b18-warrior#174 | Neue nullable Gearfelder in bereits abgewiesener Angebotszeile; fachliche Ablehnung unverändert | keine neue |
| b18-warrior#226 | Neue nullable Gearfelder in bereits abgewiesener Angebotszeile; fachliche Ablehnung unverändert | keine neue |
| b18-warrior#230 | fine F-Rank sword → 140 cp; superior F-Rank sword → 260 cp; exceptional F-Rank sword → 480 cp | keine neue |
| b18-warrior#232 | common F-Rank shield → 56 cp; common F-Rank buckler → 56 cp | keine neue |
| b18-warrior#256 | F-Rank Banded Water Serpent Skin → None cp; F-Rank Banded Water Serpent Fang → None cp; fine F-Rank sword → 140 cp; superior F-Rank sword → 260 cp; exceptional F-Rank sword → 480 cp | keine neue |
| b18-warrior#258 | crude F-Rank cuirass → 48 cp | keine neue |
| b18-warrior#316 | F-Rank Tusked Quarry Boar Hide → None cp; F-Rank Tusked Quarry Boar Hide → None cp; F-Rank Tusked Quarry Boar Hide → None cp; F-Rank Tusked Quarry Boar Tusk → None cp; F-Rank Tusked Quarry Boar Tusk → None cp; F-Rank Tusked Quarry Boar Tusk → None cp; fine F-Rank longsword → 140 cp; superior F-Rank longsword → 260 cp; fine F-Rank plate armor → 72 cp; common F-Rank shield → 56 cp; fine F-Rank sword → 140 cp; superior F-Rank sword → 260 cp; exceptional F-Rank sword → 480 cp | keine neue |
| b19-mage#44 | common F-Rank staff → 80 cp; fine F-Rank staff → 140 cp; superior F-Rank staff → 260 cp; fine F-Rank wand → 140 cp | keine neue |
| b19-mage#78 | Neue nullable Gearfelder in bereits abgewiesener Angebotszeile; fachliche Ablehnung unverändert | keine neue |
| b19-mage#106 | superior F-Rank staff → 260 cp; common F-Rank staff → 80 cp | keine neue |
| b19-mage#108 | common F-Rank robe → 48 cp; common F-Rank robe → 48 cp; fine F-Rank robe → 56 cp | keine neue |
| b19-mage#140 | Neue nullable Gearfelder in bereits abgewiesener Angebotszeile; fachliche Ablehnung unverändert | keine neue |
| b19-rogue#8 | Neue nullable Gearfelder in bereits abgewiesener Angebotszeile; fachliche Ablehnung unverändert | keine neue |
| b19-rogue#32 | Neue nullable Gearfelder in bereits abgewiesener Angebotszeile; fachliche Ablehnung unverändert | keine neue |
| b19-rogue#38 | common F-Rank shortsword → 80 cp; fine F-Rank shortsword → 140 cp; common F-Rank robes → 48 cp; fine F-Rank robes → 56 cp | keine neue |
| b19-rogue#40 | common F-Rank shortsword → 80 cp | keine neue |
| b19-warrior#46 | fine F-Rank longsword → 140 cp; superior F-Rank longsword → 260 cp; common F-Rank plate armor → 64 cp; common F-Rank cuirass → 64 cp | keine neue |
| b19-warrior#82 | Neue nullable Gearfelder in bereits abgewiesener Angebotszeile; fachliche Ablehnung unverändert | keine neue |
| b19-warrior#86 | common F-Rank longsword → 80 cp; fine F-Rank longsword → 140 cp; superior F-Rank longsword → 260 cp; common F-Rank plate armor → 64 cp; fine F-Rank plate armor → 72 cp; superior F-Rank plate armor → 88 cp | keine neue |
| b19-warrior#112 | common F-Rank longsword → 80 cp; common F-Rank longsword → 80 cp; common F-Rank buckler → 56 cp; fine F-Rank sword → 140 cp; superior F-Rank sword → 260 cp; exceptional F-Rank sword → 480 cp | keine neue |
| b19-warrior#202 | bed and supper at the orchard house hearth room → 20 cp | keine neue |
| b19-warrior#316 | Neue nullable Gearfelder in bereits abgewiesener Angebotszeile; fachliche Ablehnung unverändert | keine neue |
| b19-warrior#320 | F-Rank Wild Boar Hide → None cp; F-Rank Wild Boar Tusk → None cp; F-Rank Wild Boar Sow Hide → None cp; F-Rank Wild Boar Sow Tusk → None cp; F-Rank Wild Boar Yearling Hide → None cp; F-Rank Wild Boar Yearling Tusk → None cp; fine F-Rank longsword → 140 cp; superior F-Rank longsword → 260 cp; fine F-Rank sword → 140 cp; superior F-Rank sword → 260 cp; exceptional F-Rank sword → 480 cp | keine neue |
| b19-warrior#334 | common F-Rank cuirass → 64 cp; fine F-Rank sword → 140 cp; superior F-Rank sword → 260 cp; exceptional F-Rank sword → 480 cp | keine neue |
| b19-warrior#350 | common F-Rank robe → 48 cp; Heavy Wool Travel Cloak → 20 cp | keine neue |

## Grenzen und Gegenreview

Eine formal gültige falsche Basis-/Qualitätswahl des Modells bleibt möglich. Der Spieler sieht den verbindlichen Artikel mit Werten und Preis; Prosa kann daneben weiter ungenau sein. Keine perfekte semantische Paketerkennung behauptet. Bestehende freie Sachgeschenke/Loot werden nicht allgemein auf das neue Gear-Angebotsprotokoll umgestellt. Keine XP-, PP-, Kampf-, Monster-, Reise- oder Preiswertänderung.

Für den Gegenreview besonders prüfen: tatsächliche Warenabdeckung bei Paketwahl, Preislimit am letzten Buchungspunkt, Wiederholung verschiedener Qualitäten, gespeicherte Angebote und unveränderte Fingerprintgrenzen. Keine weiteren Pakete oder natürlichen Runs gestartet.

## Abschließende Ausführung

- Vollständiges `npm test -- --test-concurrency=4`: **2502/2502 grün**, keine übersprungenen oder fehlgeschlagenen Tests.
- Vollständiges `npm run replay:check`, nach der Fingerprinterfassung erneut unabhängig ausgeführt: **2235 Fälle, 190 Abweichungen, 190 exakt fingerprintgeprüft akzeptiert, null offen, null stale**. Darin unveränderte142 C- und48 einzeln begründete D-Ergebnisse. Keine Replay-/Fold-/State-Validierungsfehler.
- `git diff --check` grün. Kritischer Diffreview der Produktänderungen und ihrer Testanpassungen durchgeführt.
- **ST Standard und Failsoft weiterhin blockiert; technische Gesamtfreigabe bis zum echten ST-Nachweis offen.**

## Gezielte Reviewkorrektur .134

Basis `bc44df1` (.133). Ausschließlich zwei bestätigte Befunde korrigiert:

1. `trade.selectionWhy()` prüfte nur, ob ausgewählte Zeilen zur ausdrücklichen Bestellung gehören, nicht die Gegenrichtung. Ein ausdrücklich genannter zweiter Artikel konnte fehlen. Jetzt müssen alle durch die bestehenden unterscheidenden Artikelwörter erkannten, nicht ausgeschlossenen Positionen auch ausgewählt sein. Sonst Klärung und keine Zahlung/Objekte. Einzelkäufe, `not/without/except`, vollständige Käufe und allgemeines „Deal“ bleiben möglich. Ungültige Zeilen-IDs behalten die vorhandene Anzeige gültiger Positionen; sie werden nicht vom neuen Auswahlcheck verdeckt.
2. `commands.buy()` priorisiert bei der Ausgabe das vorhandene `max_cp` vor `any_price`. Meldung nennt das Limit und die Ablehnung oberhalb davon; ohne Limit bleibt echte unbeschränkte Zustimmung verfügbar. Buchungsregeln/Preiswerte unverändert.

Nachweise:

- `tests/v4/d134_review.test.js`: neun neue Tests; auf unverändertem .133 **vier rot / fünf Kontrollen**, danach **9/9**. Direkte Zustimmungsprüfung, echter `offer.accept`-Handler mit Geld-/Objektkontrolle und JSON-Event-Replay sowie Meldung/gespeichertes Limit aus `buy`.
- Gezielte Review-/Failsoft-Suiten **32/32**; bestehende D-Gearregressionen **21/21**.
- Vollständiges `npm test -- --test-concurrency=4`: **2511/2511**, keine Auslassungen. Erster Gesamtlauf deckte auf, dass die neue Meldung bei ungültiger Zeilen-ID die vorhandene Positionshilfe verdeckte; dies durch Prüfung nur bei nichtleerer gültiger Auswahl korrigiert. Der vorhandene Test blieb unverändert und ist wieder grün.
- Vollständiger Fingerprint-Replay: **2235 Fälle, dieselben190 exakt akzeptierten Abweichungen, null offen, null stale**. C-/D-Fingerprintdateien und Baseline unverändert; keine neue Ausnahmefreigabe.
- Die Ausführungsumgebung fiel zwischenzeitlich aus. Nach Wiederherstellung Änderungen erneut geprüft, Rotnachweis gegen separate unveränderte .133-Arbeitskopie und vollständige Node-/Replayprüfung erfolgreich wiederholt.
- Echte ST-Standard- und Failsoft-Smokes erneut versucht: beide vor Szenariostart am weiterhin fehlenden Chromium-Headless-Shell blockiert. **Keine .134-ST-Abnahme, keine Livefreigabe.** Kein Produktworkaround, keine Browser-/Hoständerungen.
- Build .134; Extractor/Delta/Narrator-Protokolle unverändert, kein Kartenupdate. Keine weiteren Pakete oder natürlichen Batches begonnen. Nach Veröffentlichung Stopp für Gegenreview.

## Einzelkauf-QoL-Korrektur .135

Basis `3c33350` (.134). Enger Randfall in `trade.selectionWhy()`: „I'll buy the sword. The armor is too expensive.“ wurde als Bestellung beider Artikel behandelt.

- Auswahlpflichten und Auswahlzulässigkeit werden nun aus den Kaufsätzen ermittelt, statt jede Erwähnung im gesamten Zitat als Bestellung zu zählen. Ein separater Kommentar vor oder nach dem Kaufsatz fügt keinen Artikel hinzu.
- Die vorhandenen Artikelwörter und Ausschlussregeln bleiben maßgeblich. Reine Artikellisten behalten ihren bisherigen Abgleich. Kurze Ergänzungen wie „The armor, please.“ oder „The armor too.“ bleiben Teil der Bestellung; eine echte unvollständige Auswahl wird weiter abgewiesen.
- Kein neuer Warenkatalog, kein Negativwortfilter für „expensive“, kein neuer Kaufablauf. Geld-/Preis-/Mengenprüfung, Buchung, Protokolle und Narratorkarte unverändert.
- Sieben zusätzliche Regressionen in `tests/v4/d134_review.test.js`: auf unverändertem .134 vier rot/drei positive Kontrollen; einschließlich der neun .134-Tests zunächst **4/16 rot**, danach **16/16 grün**. Echter Handlerfall bucht exakt140cp und ein Schwert, keine Rüstung. Gegenfälle prüfen ungewolltes Hinzufügen der Rüstung, Kauf in mehreren Sätzen, kurze Ergänzungen und reine Artikellisten.
- Angrenzende Review-/Gear-/Failsoft-Suiten **60/60**, vollständiges `npm test -- --test-concurrency=4` **2518/2518**, keine Auslassungen.
- Vollständiger `npm run replay:check`: **2235 Fälle, unveränderte190 exakt akzeptierte Fingerprints, null offen, null stale**. Baseline und C-/D-Fingerprintdateien unverändert. `git diff --check` grün.
- Bisherige echte ST-Abnahme weiterhin offen; dieser reine Auswahlfix ändert keine Host-/Protokollschnittstelle. Kein neuer ST-Erfolgsnachweis behauptet.
- Build .135. Keine weiteren Pakete, Balanceänderungen oder natürlichen Batches begonnen; Stopp nach Veröffentlichung.

## Abschließender Auswahl-Gegenfall .136

Basis `3ddf7ef` (.135). „I'll buy the sword. Please add the armor.“ verlor bei unvollständiger Zeilenauswahl den Rüstungswunsch: der Satzfilter zählte den ausdrücklichen Zusatzauftrag nicht zu den Kaufsätzen.

- Ausschließlich den bestehenden Filter in `trade.selectionWhy()` ergänzt: ein Satz, der mit `Add` oder `Please add` beginnt, gehört ebenfalls zum Auftrag. Kein allgemeiner neuer Prosainterpreter und keine neuen Negativwortlisten.
- Damit wird eine nur ausgewählte Schwertzeile bei diesem Zweierauftrag weiter geklärt statt bezahlt. Vollständige Auswahl bleibt zulässig. Beschreibende Kommentare wie „The armor will add protection“ zählen nicht als Zusatzauftrag.
- Fünf neue Regressionen: auf unverändertem .135 vier rot/eine positive Kontrolle; danach **21/21** in der gemeinsamen Auswahl-Reviewsuite. Die Einzelkauf-/Kommentar-/Ausschluss-/Kurzergänzungsfälle aus .134/.135 bleiben unverändert grün. Gezielte benachbarte Suiten **65/65**.
- Vollständiges `npm test -- --test-concurrency=4`: **2523/2523**, keine Auslassungen. Vollständiges `npm run replay:check`: **2235 Fälle, unveränderte190 exakt akzeptierte Fingerprints, null offen, null stale**. Keine Änderungen an Baseline oder Fingerprintlisten. Kritischer Diffreview und `git diff --check` durchgeführt.
- Build .136; Preise, Buchungsregeln und Protokolle unverändert. Die offene echte ST-Abnahme bleibt ausdrücklich bestehen. Keine weiteren Pakete oder natürlichen Batches begonnen; Stopp nach Veröffentlichung.
