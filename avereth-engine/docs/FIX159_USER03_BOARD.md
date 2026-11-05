# .159 — User03 Board-Repair und technische Verfügbarkeit

Basis `.158` / `82c2e7e90bd8425d00ef2e8ab3a2dcb66b64adc6`. Enger Fix: weder Schwierigkeitsänderung noch weitere Generatorversuche, vorgefertigte Ersatzquests oder NPC-Erweiterung.

## Originalbeleg und Ursache

User03 endet nach sechs Spielereingaben beim ersten Questboard. Das ST-Log enthält zwei Versuche mit je initialem Board und Reparatur. Beide ursprünglichen Boards hatten einen Level-1-Auftrag mit mehreren Wildschweinen; die Reparaturen machten daraus jeweils einen einzelnen Boar. Der Anker bleibt mit HP 41 / ATK 11 oberhalb der Introgrenzen HP 35 / ATK 10. Die gesamte Fünferliste wurde korrekt nicht gebucht. Die weiterhin gültigen vier Geschwister werden nicht als unvollständiges Tagesboard veröffentlicht.

Die zulässigen Intro-Anker standen auch im ursprünglichen Systemteil des Repairrequests. Es war kein verlorener Kontext: Der konkrete Reparaturfehler benannte nur die fehlende einzelne Intro-Jagd und nicht den Ankerkonflikt. Nach dem technischen Fehlschlag erfand der Narrator eine Mittagslieferung; `post_schedule` wurde dauerhaft gespeichert. Die drei Folgekontexte lieferten Mera hingegen korrekt. Das ist kein Nachweis langfristiger NPC-Erinnerung.

## Änderungen

- `guild.js`: Intro-Ankerliste aus derselben unveränderten `introAnchor`-Prüfung für Generator und Repair. Der ergänzende Hinweis nennt Menge, Level, Qtype, Populationfenster, zulässige Anker sowie tatsächlich gelieferte Anker/HP/ATK/Mengen der Level-1-Kandidaten. Eine passende Kreatur ist zu wählen, statt eine unpassende Art umzubenennen oder ihre Stats zu senken. Malforme Antworten erzeugen keine Ausnahme in der Hinweiserstellung.
- `runtime.js`: Der vorhandene eine Repair erhält diesen gezielten Hinweis. Keine dritte Boardgenerierung. Unbeteiligte Repairnachrichten bleiben einschließlich ihres Formats unverändert.
- `commands.js`: Der Narrator erhält ausdrücklich einen technisch unbestätigten Board-Aufruf und darf daraus weder ein leeres Weltboard noch Schließung, Lieferfrist oder Wartepflicht ableiten. Erneutes Lesen ist sofort möglich.
- `world.js` / `firewall.js`: Der aktuelle technische Boardfehler und der konkrete Gildenbezug begrenzen die Prüfung neu erfundener Verfügbarkeits-/Posting-Fakten. Der originale `post_schedule`-Fehler wird abgewiesen. Andere Gildenfakten, echte bereits etablierte Zeitpläne sowie normale Zeitplanfakten ohne technischen Boardfehler bleiben zulässig. Keine globale Sperre aller Zeitangaben, kein Löschen historischer Fakten.

## Reproduktion und Abnahme

`fixtures/user03_board158.json.gz` hält beide echten Original-Antwortpaare, den unveränderten Chatprefix, die ursprüngliche Narration und Extraktion sowie SHA-256 der Originalquellen. Keine vollständigen Prompts, Serverlogs oder Zugangsdaten im Fixture. Die legal korrigierte Rat-Jagd im Test ist ausdrücklich eine geskriptete Gegenprobe, kein natürlicher Repair-Erfolg.

- Auf sauberer `.158`: vier neue Prüfungen rot, zwei Schutzfälle grün.
- Gezielte Suite: **8/8** einschließlich beider Original-Reparaturketten, weiterhin unzulässigem Boar, fehlender Teilbuchung, Original-`post_schedule`, echten Zeitplänen, anderen Gildenfakten einschließlich einer Rolle als Vertragspost-Clerk, legalem Erstversuch ohne Zusatzcall und malformed Antworten.
- Vollsuite: **2801/2801**. Der vorhandene Test für den Fehlerhinweis erwartet dessen neuen technischen Wortlaut; die bestehenden Board-/Tages-/Questschutzprüfungen bleiben bestehen.
- Replay: **2235 Fälle, 517 exakt akzeptierte Abweichungen, 0 offen/veraltet**. Alle 515 bisherigen Einträge sind unverändert. Ausschließlich `b17-warrior#11` und `b18-rogue#5` haben den neuen `outcome.actions`-Hinweis für `generator_failed`. Durch Rücksetzen nur dieses Textfeldes stimmen beide vollständigen Record-Fingerprints mit der unveränderten ursprünglichen Baseline überein. Kein weiterer Event-/Zustandsunterschied. Baseline und frühere Akzeptanzlisten bleiben unverändert; `accepted_fix159_vs_126.json` nennt beide Fälle einzeln.
- ST1.19 mit geskriptetem Provider: Board-Reparatur → fünf tatsächliche Quests; regelwidriges Board → keine Buchung, Original-Wartezeitfakt verworfen, Extraktion und Save erfolgreich. Zusätzlich Standard-/Failsoft-Suite mit Finanz-, Save-Recovery-, Fetch-, S1-, UI- und .158-Kontinuitätsfällen. **Standard 76/76, Failsoft 82/82, jeweils 0 PageErrors.** Geskripteter Modellprovider auf echtem ST1.19-Host mit Playwright 1.51.1 / Chromium 134 unter Linux; kein natürlicher Modellnachweis.

Eigener Diff-Review: Ankerwerte/Spielregeln unverändert, zwei Boardaufrufe pro Versuch, kein Teilboard, Schutz nur bei tatsächlich fehlgeschlagenem Read und neuen Gildenverfügbarkeitsbehauptungen. Erste frische ST-Ausführung: alle Fachchecks bestanden, aber HTTP-/JSON-Fehler in ST; kein bestandener Gesamtlauf. Wiederholung ohne Lockerung der Fehlerprüfung.

## Grenzen / nächster Test

Kein natürlicher Modellnachweis: Das Modell kann Vorgaben weiterhin verletzen; die Engine muss dann das gesamte ungültige Board abweisen. Auch mit präziseren Hinweisen gibt es keine garantierte Generierung.

Bereits auf `.158` gespeicherte falsche Wartezeit-Fakten werden nicht rückwirkend gelöscht. Ein erneuter Board-Aufruf benötigt mechanisch keine Wartezeit; für eine saubere natürliche Gegenprüfung eignet sich ein frischer kurzer Run mit demselben Ansatz. Die natürliche Abnahme und längere NPC-Memory-Tests bleiben offen.
