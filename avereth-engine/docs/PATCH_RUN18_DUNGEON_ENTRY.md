# Run 18 – Dungeon-Erstkontakt (.94)

Basis: `.93`, Entwicklungs-HEAD `f51336c`. Engine-Build **4.3.0-c.6.6.94**. Keine Änderung an Kampfwerten, XP, Rangbändern, Generatorbudgets oder Narrator-Vertrag (.85).

## Ursache und Korrektur

Original `20261026-031107Z-current_test`, ZIP-SHA-256 `96966a0e853e6ca618998834f78e315ecb504fc3e0ea6efa2213935aa5898203`, CRC geprüft. T56 bestätigt die unterirdische Ankunft nicht; das bleibt so. T57 erreicht den kanonischen Dungeon-Eingang und meldet anschließend ein Skelett. In .93 entstehen dessen Entity und Profil **Level 28/E, 192 HP, ATK 69**, bevor `dungeon.established` die eigentliche F-Erststockpopulation festlegt. Der Spieler sah die 192 HP, nicht Level und Angriffswert. Der Tod ist kein Nachweis einer allgemeinen Mage-Unterlegenheit.

`world.js:newEntity` richtet in **Rule 2/V4-C** jetzt einen tatsächlich erreichten True Dungeon mit dem vorhandenen `establishEvents` ein, bevor eine Kreatur gegen seine Slots geprüft oder materialisiert wird. Die frühere Ausnahme `livingBefore.has(root)` gilt dort nicht mehr: Auch der erste Antwortzug muss die bestehende Populationsregel einhalten. Die Einrichtung wird als **Engine-Schritt** gebucht; `creature.new` erhält dafür keine zusätzliche Berechtigung. Zeitablauf und Dungeon-Synchronisierung bleiben an ihren bisherigen Stellen. Rule 1 behält seine historische Erstkontaktsemantik; seine vorhandenen Regressionen werden nicht umgeschrieben.

Der Eingang bleibt Floor 0. Dort wird dem freien Skelett kein Floor-1-Slot zugeschrieben; die Meldung wird vor Entity-/Profilerzeugung zurückgewiesen. Die folgenden Referenzen können keinen Gegner nachträglich erzeugen. Bestätigte Ankünfte, vorhandene Ebenen, Slotidentitäten und deren Rang-/Levelgrenzen bleiben verbindlich. Eine abgewiesene Passage wird nicht aus der Prosa erzwungen.

Freie Kreaturen in gewöhnlichen Ruinen, nicht feindliche Kreaturen und nicht zur Dungeonpopulation gehörende Tiere am Eingang bleiben möglich. Tatsächlich zugeordneten E-Ebenen wird kein F-Limit aufgezwungen. Neue APIs, Deltas, Zustandsfelder oder ein zweites Spawnsystem entstehen nicht.

## Zwei Runner-Präzisierungen

`PLAYER_MECHANICS` ergänzt nur die freigegebenen Hinweise: Nach Beheben einer Voraussetzung die abgelehnte Folgehandlung erneut ausführen; Registrierung nimmt keinen Vertrag an. Erlaubte, ausstehende, bedingte oder angekündigte Handlungen gelten erst nach bestätigter Ausführung als erledigt. Bei Reise-Widersprüchen gilt der bestätigte Ort.

Level-15-Ziel, 100-Input-Vergleich, Sicherheitsgrenzen, freie Spielerentscheidungen und JSON-Erinnerung bleiben erhalten. Kein Plain-Text-Fallback und keine neuen Handels-/Quest-Wortfilter. Die bestehende Prompt-Regression prüft auch die beiden Ergänzungen.

## Regressionen und Abnahme

Die Fixture enthält die originalen Engine-Ereignisse vor T56, die beiden Spielerrecords, Erzählertexte und Extractor-Antworten T56/T57 sowie den alten T57-Record zum Kompatibilitätsschutz. Sie enthält keine Modell-Reasoning-Logs. Die Tests führen die ursprünglichen World-Übergänge aus, ohne einen Ersatzgegner oder eine erfolgreiche Ankunft zu erfinden.

Acht Regressionen: Auf unveränderter `.93` **drei rot/fünf grüne Kontrollen**. Originaler Erstkontakt, Buchungsreihenfolge, mehrere/entfernte Erstkontaktgegner, gewöhnliche Ruine, zulässige Kreaturen am Eingang, tatsächliche F-/E-Slots samt Wiedererkennung, Replay/JSON-Reload/Swipe und unveränderte historische Profile.

Abnahme selbst ausgeführt: neue Fälle **8/8**, angrenzend **100/100**, vollständiges `npm test` **1.831/1.831**. Der erste Volllauf zeigte **zwei Rule-1-Regressionen**; die historische Ausnahme bleibt deshalb dort ausdrücklich erhalten. Die alten Tests wurden nicht geändert. Finaler echter `npm run smoke:st:c` auf SillyTavern 1.19 mit Mock-Provider **21/21**, **fünf Extractor-Aufrufe**, keine PageErrors; vier tatsächlich gespeicherte aktuelle Story-Replies jeweils `applied` und genau ein `extract.applied`. Ein separater Runner-Selbsttest wurde für die zwei reinen Promptzeilen nicht wiederholt; die bestehende Runner-Promptregression und die Vollsuite sind grün. Ein natürlicher GLM-Lauf wurde nicht gestartet: In dieser Umgebung ist kein Live-API-Schlüssel verfügbar.

## Grenzen

Bereits gespeicherte .93-Entities und Kampfprofile werden nicht rückwirkend gelöscht oder heruntergestuft; alte Spielstände bleiben ladbar. Die Korrektur verhindert die neue ungebundene Erzeugung beim ersten Kontakt. Sie garantiert keine vollständige sprachliche Erkennung von Ankunft oder Gefahr. Ein natürlicher GLM-Lauf mit neuer Kampagne und aktuellem Runner steht noch aus; die persönliche Karte benötigt weiterhin Revision .85.
