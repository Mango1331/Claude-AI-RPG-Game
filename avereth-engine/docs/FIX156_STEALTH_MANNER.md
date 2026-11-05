# .156 — Stealth als Vorgehensweise bei Bewegung (S1)

Grundlage: main `PATCH_STEALTH_ACTION_MANNER.md` und Gegenfeedback vom 04.11.2026; Ausgang `.155 / 62672d8`. S2 (heimliche Suche/Aufnahme) folgt erst nach persönlicher Prüfung der Bewegungsgrundlage. Keine NPC-, Finanz-, Formel- oder Aktionsökonomieänderung.

## Ursache und Umsetzung

User01 I73/T33 enthielt eine vorbereitete Reisefortsetzung mit Anschleichen am Ziel. Der alte Plannervertrag meldete `journey.continue` und konkurrierendes `stealth`; die Priorisierung nahm nur Hide am Ausgangsort. Die World-Firewall verweigerte folgerichtig den später erzählten Ortswechsel.

Der Plannervertrag `plan-c0.2` erhält optionale, streng geprüfte `manner:{kind:'stealth',scope:'action'|'destination'}` an GO/Continue, lokal MOVE nur `action`. Die tatsächliche Handlung bleibt erhalten. Alte getrennte Continue/Stealth-Antworten gehen durch den vorhandenen einmaligen Repair, statt am Ausgangsort zu verstecken. Verbundene .155-GO-Pläne bleiben unverändert kompatibel.

GO und beide bestehenden Continue-Wege schreiben dieselbe Autorisierung. `action` prüft den tatsächlich erreichten Halt; `destination` erst das tatsächlich erreichte etablierte Ziel. Unterwegs unterbrochene Zielannäherung ist kein gespeicherter Stealth-Modus für spätere Eingaben. Eine sichtbare Meldung nennt die noch nicht aufgelöste Zielheimlichkeit. Erzwungene Verlagerung und abgewiesene Ankunft gewähren keinen Check.

World prüft nach tatsächlicher Ankunft und Living-Dungeon-Materialisierung, vor anschließender Wahrnehmung/Kampföffnung. Die unveränderte `stealthEvents`-Mechanik wird über einen kleinen gemeinsamen Buchungshelfer verwendet. Lokales MOVE prüft nach genau dem tatsächlich gebuchten Ein-Band-Schritt, ohne erneute Reise. Kein tatsächlicher Schritt bedeutet keine kostenlose Versteckprobe. Erkennen allein startet keinen Angriff; Awareness, Concealment und Ambush bleiben die bestehenden Regeln.

**Bewusste Grenze:** Mehrere Reiseetappen mit Stealth sowie Stealth-Move plus separater Angriff/Skill werden vor Ausführung geklärt. S1 baut keine mehrphasige Reiseauflösung. Gewöhnliche Mehr-GO-Eingaben bleiben unverändert. Such-/Take-/Türaktionen erhalten noch keinen Modifier. Die Erweiterung benutzt den zentralen Planner, keine englischen Sonderformulierungslisten. Erzählerkarte/Extractorversion unverändert, keine Kartenaktualisierung.

## Nachweise

- Originalfixture aus unverändertem User01-Chat auf main (Metadaten/Quellhash in `user01_stealth.json.gz`), keine erfundene Zielpopulation.
- 12 neue Regressionen auf `.155`: 10 rot, 2 grüne Kontrollen. Auf .156: 12/12; zusammen mit den 19 .155-Fällen 31/31.
- Originalhostkette mit aufgezeichnetem Altplan, tatsächlichem Repair, tatsächlicher Ankunft und Event-Fold. Getrennte kontrollierte Fälle für echte Zielbeobachter, Erfolg/Fehlschlag, Zwischenhalt, Zwangsverlagerung, blockierten Dungeonweg, lokale Bewegung, aktive Kämpfe, fehlende Reise, Reload/Swipe und keine geerbte Heimlichkeit.
- Volle Node-Suite: 2754/2754.
- Fingerprint-Replay: 2235 Fälle; 479 bestehende Abweichungen exakt bestätigt, 0 offen, 0 veraltet. Keine Listenänderung.
- Echter isolierter ST-1.19-Standard-Smoke erweitert um User01, gespeicherten vollständigen Chat, Swipe/Reload und normalen Folgezug: **55/55**, 59 Modellaufrufe / 23 Extraktionen, 0 PageErrors; zusätzliche gemeinsame Standard-/Failsoft-Abnahme in .157. Der erste Versuch hatte eine veraltete Smoke-Versionserwartung und eine nicht aufgeschlüsselte neue Save/Swipe-Prüfung; nach Korrektur der Versionsprüfung und Aufteilung der Diagnose alle Prüfungen grün, ohne Produkt-Workaround. Der frühere rote Versuch gilt nicht als bestandene Abnahme.

## Geänderte Bereiche

`planner.js`, `commands.js`, `world.js`, `checks.js`; Version in util/manifest/package; neue Regression und Originalfixture; Versionskontrolle im vorhandenen Planner-Test und zwei ST-Smoke-Helfer. UI/QoL wird getrennt in .157 umgesetzt. Kein natürlicher GLM-Lauf gestartet; der geskriptete echte Host-Smoke belegt nicht die natürliche Modellqualität.
