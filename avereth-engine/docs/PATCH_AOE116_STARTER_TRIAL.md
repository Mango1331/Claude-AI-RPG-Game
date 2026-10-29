# .116 – frühe AoE-Starteroptionen und Band-Zielauswahl

Basis `.115` / `9c65e9a`. Nutzerfreigabe vom29.10.2026 nach GPT-Feedback; Build **4.3.0-c.6.6.116**. Kein Main-/Minor-Patch, keine Änderung von XP, Startwerten, Monsterprofilen oder der .114-F-Balance.

## Fähigkeiten und freie Charaktererstellung

| Neue ID / Name | F-Rang / Complexity | Rohpower pro Ziel | Kosten | Reichweite / Fläche |
|---|---|---|---|---|
| `warrior.cleave` / Cleave | F / C2 | 8 + STR ×1,25 + ATK | 10 STA | alle gültigen Ziele ENGAGED |
| `mage.arcane_wave` / Arcane Wave | F / C2 | 8 + INT ×1,25 + MATK | 14 MP | genau das gewählte Band bis MEDIUM |
| `rogue.fan_of_blades` / Fan of Blades | F / C2 | 6 + AGI ×1,125 + ATK | 10 STA | genau das gewählte Band bis SHORT |

Die Werte sind ein bewusst vorläufiger Gameplayversuch. Eine Aktivierung ist eine Hauptaktion, Kosten einmal, Schadensrechnung pro Betroffenem. Einzelzieltechniken behalten ihre höhere Einzelzielwirkung. Keine zusätzlichen Angriffe, Waffeninstanzen, Gift-, Munitions-, Trefferchancen- oder Richtungsregeln.

Neue Ruleset-2/V4-C-Start-Events speichern `starter_aoe:true`. Nur deren Charaktererstellung nutzt die zusätzlichen Starterpools in `campaign_start.json`: Cleave ersetzt Power Strike, Arcane Wave ersetzt Arcane Burst, Fan of Blades ersetzt Feint im jeweiligen Sechsermenü. Die ursprünglichen Definitionen und Klassenpools bleiben im Content. Menschen wählen weiterhin frei **genau zwei** Starter-Skills, Basic Attack kommt wie bisher dazu. Keine automatische dritte Fähigkeit.

`starterPool` wird gemeinsam von Eingabeparser, Auswahlprüfung, Systemmenü und Narrator-Kontext verwendet. Historische Start-Events ohne Flag, V4-A, Ruleset1 und NPC-Templates behalten ihre bisherigen Pools. Die Testharness pinnt historische Szenarien ausdrücklich auf diese alte Auswahlpolicy; neue Tests verwenden den echten Produktstart. Gelernter `mage.arcane_burst` bleibt derselbe ENGAGED-Zauber mit derselben ID und denselben Zahlen; keine stille Umwandlung und keine Migration laufender Action Libraries.

## Band-AoE statt räumlicher Cluster

Der neue geschlossene Effekt `area.shape:target_band` ergänzt `caster_engaged`. Ein genanntes sichtbares Ziel bestimmt das Band, nach einer gegebenenfalls erklärten Bewegung und anhand der aktuellen Kampfposition. Alle gültigen Betroffenen in **diesem einen** Band werden berücksichtigt, einschließlich neutraler Personen und Verbündeter. Andere Bänder bleiben unberührt. Kein Cluster, Winkel oder Raster; keine automatische Gegner-only-Auswahl. Ohne Ziel zur Bandwahl wird nachgefragt, statt ein Band unter mehreren selbst zu bestimmen.

`areaBand` liefert die gemeinsame Bandbedeutung für Szenen-Mitbetroffene und Kampf. Der bestehende Trialstart prüft die Aktion vor Kosten/Buchung. Derselbe Pfad nimmt bisherige Nichtkombattanten auf; im laufenden Kampf werden die aktuellen statt veralteter Szenenbänder verwendet. Eine erklärte Bewegung wird vor Auswahl der Mitbetroffenen berücksichtigt. Volle Deckung macht das Fernziel unzulässig und hält verdeckte sekundäre Ziele aus dieser neuen Fernfläche heraus; sonstige Deckungs-/Schadensregeln bleiben bestehen. Unzulässige Reichweite oder fehlende Ressourcen buchen keinen Kampf und keinen Verbrauch.

Skillvalidierung, Planner-Kurztexte, System-Skillanzeige und Entwicklung bestehender Skills berücksichtigen die neue Form. Ein C3-Nachfolger kann die Bandform behalten. Historische Nahbereichs-AoE und Cluster-Burst-Items behalten ihre bisherigen Zielregeln. Skills über mehrere Bänder sind weiterhin nur eine spätere Idee.

## Ward: nicht ausgeführt muss sichtbar bleiben

Der Mage aus Batch11/T18 bekam außerhalb des Kampfs weder Kosten noch Barriere, während die Geschichte einen aktiven Ward behauptete. Für den C-Pfad endet eine außerhalb eines Kampfs nicht unterstützte Schutz-/Vorbereitungsfähigkeit jetzt mit ausdrücklichem **NOT EXECUTED**, ohne Kosten oder Effekt, und entsprechender bindender Narrator-Anweisung. Die Prüfung verwendet kanonische Effekttypen, keine Prosa-Wortlisten. Heilung/Restore außerhalb des Kampfs und reguläre Fähigkeiten innerhalb eines Kampfs behalten ihre Pfade; gewöhnliche Weltinteraktionen und Mobility werden nicht pauschal gesperrt. Kein Prebuffsystem oder Schutzübertrag in einen späteren Encounter.

## Runner-Versuch

`current_test` verlangt für die nächste Vergleichsserie einen der beiden Starterplätze mit der jeweiligen AoE; der zweite bleibt frei. Szenarioprompt und Erstellungsziel übernehmen die Anforderung für alle drei Klassen. Einzelrunner und Batch prüfen anschließend die tatsächlich gebuchte Auswahl; bei Abweichung wird ein Szenariofehler gemeldet, keine Figur umgeschrieben und kein Skill injiziert. Andere Guides ohne diese Anforderung bleiben unverändert.

AoE **nur bei taktischem Nutzen** verwenden; keine Pflicht zum AoE-Kampfbeginn, zu Gruppenangriffen oder zum Weiterkämpfen bei Todesgefahr. Routen, Aufträge, Ausrüstung und spätere Entwicklung bleiben frei. Historische Läufe ohne AoE bleiben Vergleichsmaterial; dies ist kein kontrollierter Beweis, dass AoE allein die Rogue-Sterblichkeit behebt.

## Regressionen und Abnahme

- **26 neue Regressionen:** gegen unverändertes .115 **20 rot / sechs grüne Kontrollen**, danach **26/26 grün**. Erfasst alle drei Menüs, genau-zwei-Auswahl, historischen Burst, ENGAGED/SHORT/MEDIUM, fremde Cluster, neutrale Mitbetroffene, Deckung, Reichweite, einmalige Kosten, verweigerte Buchung, Bewegung und neue Teilnehmer im aktiven Kampf, Planner-Bandwahl, Ward, dynamische Validierung/Evolution sowie Einzel-/Batch-Runneranforderung.
- Vollständiger Hostfall: neue Mage-Erstellung → Planner → AoE → Extractor → serialisierter Chat/Reload und geänderte Swipe-Prosa; kein zweiter Ressourcenverbrauch. Historische Kampf- und Area-Regressionen bleiben unverändert gültig.
- Vollständige npm-test-Dateiliste mit `--test-concurrency=4 --test-reporter=tap`: **2.279/2.279**, keine übersprungenen Tests, Exit0. Der erste Gesamtlauf hatte drei reine Abweichungen der historischen Fehlermeldung; der ursprüngliche ENGAGED-Meldungstext wurde erhalten, keine alten Assertions gelockert.
- Echter **ST1.19-Mock-Smoke:23/23**, **sechs Extractor-Aufrufe**, `extractPerReply`, `fightOpened`, neuer `bandAreaOnce`, aktueller Vertrag und `noPageErrors` grün. Der zusätzliche echte Browserzug führt Arcane Wave gegen zwei Ziele mit einmalig14MP aus. Vorhandener Swipe-/Speichernachweis bleibt enthalten.
- Das GPT-Feedback zum alten `run.mjs` wurde geprüft: Dieser Smoke ist ausdrücklich **V3/Legacy**. Dort bleibt Cleave richtigerweise keine Starteroption und die absichtlich falsche Auswahl erhalten. Der aktuelle **C-Smoke** wählt dagegen Arcane Wave und prüft dessen echte Ausführung; keine Legacy-Prüfung abgeschwächt.

Narrator-Vertrag und Extractorformat unverändert; keine Aktualisierung der persönlichen Karte nötig. Neue Kampagne für den AoE-Starterversuch erforderlich. Kein natürlicher GLM-Lauf gestartet. Ein tatsächlicher Vergleich muss Nutzung, Gruppengröße, Rückzug, Gear und Ausgangsressourcen getrennt erfassen; die Zahlen sind noch kein abgeschlossenes F-Balancing.
