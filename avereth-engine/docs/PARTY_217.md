# Partyentwicklung .217

Interne Sicherung auf dem Entwicklungsbranch. Ausgangspunkt ist .216 auf `bf44a5fb`. Der verbindliche Fachplan mit D10–D12 steht auf main, Dokumentationscommit `fba80471`.

## Foundation

Das Ereignisprotokoll speichert Vorschlag, zustimmende Parteien, Mitgliedschaft und Reisemodus. Erst das reguläre X nach der Annahme legt ein bisher fehlendes Profil anhand der dann bekannten Ausbildung fest. Reise, Torkontrolle und Katalog lesen dieselben Entitäten. Der Composer öffnet die lokale Partyansicht vor dem Senden.

Die Offlineprobe `node tools/replay/party217.mjs <User14>/originals/chat.jsonl` nutzt die gespeicherten Spieler- und Narratortexte sowie vorgegebene strukturierte Antworten. Sie prüft Beitritt, Sprecher, Warten, Wiederaufnahme, Austritt und Ossens mechanischen Bogen mit 20 Pfeilen. Die bisherigen Planner- und Ownership-Tests bestanden. Die Gruppenauflösung, Progression und technische Gesamtabnahme folgen in den nächsten Paketen.
