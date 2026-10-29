# Batch 10 – technischer Folgepatch .115

Basis `.114` / `89aaf08`; Build **4.3.0-c.6.6.115**. Behebt vier anhand des Batches `20261028-165307Z` geprüfte Ursachen. Die F-Balance aus .114, XP, Monsterwerte, Testspieler und Aktionsökonomie bleiben unverändert.

## 1. Providerfehler hinter HTTP 200

SillyTavern 1.19 kann einen fehlgeschlagenen Upstream-Aufruf als HTTP 200 mit `error.message: "Internal Server Error"` weiterreichen. Die bisherige Statusprüfung behandelte diesen vorübergehenden Fehler als dauerhaft; beim Warrior endete dadurch die Extractor-Recovery vorzeitig.

`providerResponseError` im vorhandenen `narrator_recovery.js` klassifiziert jetzt den Fehlerkörper für Host und Narrator gemeinsam. Explizite transiente Typen/Codes und exakt bekannte HTTP-Statusphrasen sind wiederholbar; Authentifizierung, Quota, ungültige Requests und unbekannte HTTP-200-Fehler bleiben hart. Der tatsächliche HTTP-Status wird nicht umgeschrieben. Die Runtime protokolliert die Einstufung und nutzt ihre bestehenden begrenzten Wiederholungen und sicheren Fortsetzungswege.

Keine zusätzlichen Versuche oder höheren Budgets: Extractor höchstens drei Aufrufe, Narrator weiterhin höchstens eine Providerwiederholung. Abbruch-, Auftrags- und Speicherschutz bleiben erhalten. Eine Wiederholung sendet keine Spielerhandlung erneut an die Engine.

## 2. Board: Ziel und Risikohinweis trennen

Die originalen Boardantworten C109/C110 nennen Ebene 1 als Ziel und warnen im Aufgabentext vor Ebene 2. Der Validator behandelte diese Warnung als zweiten, für Novice verbotenen Einsatzort.

Beim bestehenden strukturierten Zähljagd-/Räumungsprofil bestimmt nun `DEFEAT.where` den Dungeonort. Ziel und Titel werden weiterhin auf unzulässige Ebenen geprüft; eine Warnung im freien Aufgabentext verändert das Ziel nicht. Verteilung, Population, Rang, Annahme und Auszahlung bleiben unverändert. Historische Boardprofile behalten ihre bisherige Textauswertung.

## 3. Lokale Jagdorte behalten ihre Population

Die originalen neuen Höhlen-/Nestorte wurden direkt dem Reich zugeordnet. Dadurch fehlte die Verbindung zur bereits etablierten Jagdpopulation; der vorhandene Materialisierungspfad verwendete stattdessen die allgemeine Rangskalierung.

GO erhält das optionale Feld `within`: die bestehende Habitat-ID ausschließlich für eine lokale Fortsetzung in einen noch unbenannten Teil dieses Gebiets. Der Planner sieht das aktuelle Habitat. Der Handler akzeptiert die Angabe nur im Ruleset-2/C-Fortschrittspfad, innerhalb der aktuellen Habitat-Abstammung und für ein neues Ziel. Abreise, bekannte Ziele und unabhängige Orte verwenden diesen lokalen Bezug nicht.

Die gemeinsame Ortsnormalisierung übernimmt das autorisierte Habitat als Parent nur bei genau passendem neuem Ziel und bestätigter Ankunft. Ein fehlender oder übergeordneter Reich-/Regionsparent wird korrigiert; ausdrückliche unabhängige Parents, bekannte Orte, Mehrdeutigkeit und `arrived:false` bleiben unverändert. Parser und World-Einstieg verwenden dieselbe Funktion; die Originalantwort wird nicht verändert. Keine Population wird aus Artennamen oder räumlicher Nähe geraten.

Danach gelten die vorhandenen Populations-, Level- und Questregeln. Kein neues Spawnsystem, keine Änderung von Gegnerwerten oder Questzählung. **Grenze:** Der Planner muss eine lokale Fortsetzung als solche kennzeichnen. Alte falsch eingeordnete Orte, erzeugte Profile und bereits gebuchte Kills werden nicht rückwirkend migriert.

## 4. Bestellte und gebuchte Warenpositionen

Beim Warrior wurden trotz ausdrücklicher Bestellung von Boxbett und Eintopf zwei Schlafpositionen ausgewählt. Der Gesamtpreis allein deckte die falsche Auswahl nicht auf. Zusätzlich wurde ein einzelner gemeinsamer Preis fälschlich als Preis nur einer Position interpretiert.

Die bestehende gemeinsame Zustimmungsprüfung vergleicht jetzt unterscheidende Wörter der tatsächlichen Angebotspositionen einschließlich ihrer Angebotsklauseln mit der Bestellung. Klar ausgeschlossene oder abweichende Positionen werden vor Zahlung zurückgewiesen. Allgemeine Zustimmung wie „Deal“ bleibt möglich; Verkäufe bleiben unverändert. Separate Positionspreise werden nur bei mehreren Geldangaben ausgewertet; einen einzelnen Gesamtpreis prüfen die vorhandenen Gesamtpreis-/Mengenregeln.

Der Originalkauf mit den richtigen Positionen bucht genau ein Bett und einen Eintopf für 6 Kupfer. Die falsche Auswahl bucht weder Geld noch Leistungen. Keine neue Zimmerverwaltung und kein Verbot eigenständiger späterer Käufe.

## Regressionen und echte Abnahme

- **26 neue Tests** in `tests/v4/patch_batch10_followup.test.js`, mit Originalantworten und gefalteten Vorzuständen im zugehörigen Fixture. Gegen unverändertes .114: **19 rot, sieben grüne Kontrollen**; danach **26/26 grün**. Die Habitatfälle ergänzen den originalen GO um das neue `within` und prüfen anschließend die originalen World-Antworten; unveränderte historische Commands erhalten keinen nachträglich erfundenen Bezug.
- Gegenfälle: tatsächliche E-Ziele und widersprüchliche Titel, unabhängige Abreisen/Parents, fremdes Habitat und unbestätigte Ankunft, generische Kaufzustimmung, ausgeschlossene Positionen, getrennte Preise, permanente Providerfehler, ausgeschöpfte Recovery und Replay. Korrekte Käufe und Weltzustände werden serialisiert, erneut gefaltet und validiert.
- Angrenzend **134/134** im Zwischenstand einschließlich der ersten 22 neuen Fälle. Abschließend die **vollständige npm-test-Dateiliste mit vorangestellten Node-Flags `--test-concurrency=4 --test-reporter=tap`: 2.253/2.253**, keine ausgelassenen, übersprungenen oder abgebrochenen Tests, Exit 0.
- Echter **ST-1.19-Mock-Smoke auf .115: 22/22**, **fünf Extractor-Aufrufe**, `extractPerReply`, `fightOpened`, aktueller Vertrag und `noPageErrors` grün. Modellantworten im Smoke sind kontrolliert; dies ersetzt keinen natürlichen GLM-Lauf.
- Entwicklungszwischenstände waren wegen zu striktem Warenabgleich sowie Versions-/isolierten Host-Testabhängigkeiten rot. Die bestehenden Verhaltensprüfungen wurden nicht gelockert; der Warenabgleich nutzt die vorhandene Wortnormalisierung und Angebotsklauseln.

Protokollstände: **cmd-1.7**, **extract-5.17**. Narrator-Vertrag unverändert, **keine persönliche Kartenaktualisierung nötig**. Kein natürlicher Batch gestartet. Nächster Nachweis ist ein frischer Vergleichslauf mit unveränderten .114-Balancewerten; insbesondere Habitat-Kennzeichnung und tatsächliche Provider-Recovery bleiben dabei zu beobachten.
