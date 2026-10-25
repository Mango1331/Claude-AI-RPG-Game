# Run 14 – vorläufiges Gildenboard ohne neue Lieferangebote (.87)

Basis: getrenntes World-Paket .86. Verbindlicher Nutzerauftrag vom 25.10.2026: Im aktuellen Ruleset-2/V4-C-Board vier Monsterjagden plus eine geeignete bekannte Dungeon-Level-Räumung; ohne geeigneten Dungeon fünf Jagden. Automatische neue Lieferangebote sind vorläufig ausgesetzt, das Delivery-System bleibt ausdrücklich erhalten.

## Umsetzung und Kompatibilität

`runtime.js:boardFor` kennzeichnet neue Ruleset-2/C-Generatoranfragen mit `profile:hunt_clear`. `guild.js` verwendet dafür das bestehende Boardprofil, denselben Generator, Validator und einen Repair: neue Lieferungen werden abgewiesen, Quoten sind 4/0/1 beziehungsweise 5/0/0. Schema/Questtypen bleiben vollständig erhalten. Die Novice-Einstiegsjagd, Rang-/Ebenenprüfungen und tatsächlich mögliche Dungeon-Jagdpopulationen gelten unverändert. Dungeonjagden verbrauchen weiterhin nicht die Räumungskategorie (.84).

Ein heute bereits veröffentlichtes Board wird nicht neu erzeugt oder verändert. Alte Lieferangebote bleiben annehmbar und ausführbar; aktive Lieferungen behalten Ziele, Waren, Mengen, Herkunft, READY, Auszahlung und Quest-XP. Bei einer Teilnachfüllung zählen ausdrücklich beibehaltene Lieferangebote zur Gesamtzahl; fehlende Plätze werden ausschließlich mit Jagd/Räumung ergänzt. Es wird keine zusätzliche Lieferung generiert. Der normale C-Pfad veröffentlicht am neuen Gildentag weiterhin ein vollständiges neues Board, wie bisher.

Unversionierte historische Generatoranfragen bleiben mit ihrer bisherigen 2+2+1-Auswertung lesbar; Ruleset 1 und V4-A behalten ihre vorhandenen Regeln. Neue reale Ruleset-2/C-Anfragen werden stets von boardFor markiert. Kein neues Kampagnenflag, keine Umschreibung gespeicherter Verträge, keine zweite Board-Engine. Zur späteren Wiederaufnahme ist das bisherige Profil samt Lieferprüfung vorhanden, keine Rekonstruktion des Systems nötig.

**Unverändert:** delivery.js, physische GIVE/DROP-Übergaben, Receipt-/Provenienzprüfung, Gildenabgabe, Belohnungswerte, XP, Monster-/Kampfwerte, Rang und Testspieler-Leitfaden. Boardversion board-5.1; Extractor bleibt extract-5.7, Narrator-Vertrag .85. Gegenstands-/Geldgeschenke und freie NPC-Hilfe bleiben normale Weltinteraktionen.

## Tests

10 neue Regressionen in patch_run14_board.test.js: gegen .86 sechs rot/vier grüne Kontrollen; nach Korrektur 10/10. Getestet: tatsächliche aktuelle Profilwahl; 4+1 und 5+0; nummerierte Dungeonjagd plus Räumung; doppelte Räumung; falsche Ebene/Population; Einstiegsjagd; Generator und begrenzter Repair; bestehendes Board unverändert; Teilnachfüllung mit Altlieferungen; unversionierte und Ruleset-1-Kompatibilität.

Der Liefer-Szenariotest veröffentlicht ein historisches Board, nimmt eine Lieferung an, übergibt echte gebundene Fracht über den normalen GIVE-Pfad, erzeugt den Lieferreceipt, lässt die bestehende World-Prüfung READY setzen und zahlt über normalen Turn-in genau einmal inklusive Quest-XP aus. Er wiederholt die Abgabe und prüft serialisiertes Event-Replay für Quest, Inventar, Gilde und PC-Sheet. Orts-/NPC-/Fracht-Vorbedingungen werden im Test aufgebaut; die tatsächliche mehrörtige Reisekette wird separat im World-Paket getestet. Keine künstliche Behauptung eines natürlichen Delivery-Erfolgs.

Vier bestehende Produktpfad-Tests (Boardauskunft, Dungeonziel und zwei Forge-Retry-Szenarien) mussten ihre generierten Mockangebote von Lieferungen auf die neue Jagdverteilung umstellen. Ihre eigentlichen Assertions bleiben bestehen. Historische Lieferfixtures und Tests wurden nicht entfernt oder auf neue Erwartungen umgeschrieben. Die Versionsprüfung erwartet board-5.1.

Angrenzende Board-/Delivery-Tests 60/60, weitere Produktpfade 89/89. Vollständiges npm test: **1691/1691**. Echter ST-1.19-Mock-Smoke **21/21**, fünf Extractor-Aufrufe, keine PageErrors; vier gespeicherte Antworten jeweils applied/genau ein extract.applied. Kritischer Diff und diff --check geprüft. Kein natürlicher GLM-Nachweis.

## Grenzen

Die Aussetzung betrifft neue automatische Angebote im aktuellen Pfad, nicht alle Gegenstandsinteraktionen der Welt. Allgemeine LLM-Fehler sind dadurch nicht ausgeschlossen. Weniger nichtkämpferische Gildeneinnahmen und mehr Kampfangebote sind die bewusst akzeptierte Designabwägung; Einsteigeraufträge bleiben vorhanden und freiwillig. Kein Gildenkurier-Modus und keine Reparatur der allgemeinen Lieferidentitäten. Ein natürlicher neuer Langlauf wurde nicht gestartet.
