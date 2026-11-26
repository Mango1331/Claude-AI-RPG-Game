# Partyentwicklung .217

Interne Sicherung auf dem Entwicklungsbranch. Ausgangspunkt ist .216 auf `bf44a5fb`. Der verbindliche Fachplan mit D10–D12 steht auf main, Dokumentationscommit `fba80471`.

## Foundation

Das Ereignisprotokoll speichert Vorschlag, zustimmende Parteien, Mitgliedschaft und Reisemodus. Erst das reguläre X nach der Annahme legt ein bisher fehlendes Profil anhand der dann bekannten Ausbildung fest. Reise, Torkontrolle und Katalog lesen dieselben Entitäten. Der Composer öffnet die lokale Partyansicht vor dem Senden.

Die Offlineprobe `node tools/replay/party217.mjs <User14>/originals/chat.jsonl` nutzt die gespeicherten Spieler- und Narratortexte sowie vorgegebene strukturierte Antworten. Sie prüft Beitritt, Sprecher, Warten, Wiederaufnahme, Austritt und Ossens mechanischen Bogen mit 20 Pfeilen. Die bisherigen Planner- und Ownership-Tests bestanden. Die Gruppenauflösung, Progression und technische Gesamtabnahme folgen in den nächsten Paketen.

## Gemeinsamer Kampf

Auf dem Foundation-Commit `81f244cd` baut die Gruppenauflösung auf. Ein neu eröffneter Encounter mit zugesagtem Kampfpartner verwendet eine gemeinsame Positionslinie. Vorschau und Angriff lesen den Abstand zwischen Handelndem und Ziel. Initiative, Skillkosten, Schaden und Munition benutzen die bestehenden Kampffunktionen. Belegte Gruppenabreden halten Paare und persönliche Zustimmungen fest. Eine Flucht belegt den eigenen Zug, das Beobachtungsfenster endet spätestens am früheren PC-Platz.

Die Originalpräfixprobe erreicht einen echten Schuss Ossens. Zwei gegnerische Ziele, getrennte und gemeinsame Flucht sowie Teilfrieden wurden lokal geprüft. Die 18 bestehenden Eingabetests und der User13-Surrenderlauf bestanden. XP-/Questabrechnung und Gesamtabnahme folgen.
