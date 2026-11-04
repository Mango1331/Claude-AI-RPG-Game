# Quellenmanifest – User-Testrun 01

Eingereicht am 04.11.2026, natürlicher SillyTavern-GLM-Lauf auf Build .155. Die beiden strukturierten Exporte und das Originalfeedback sind **byte-identisch** zum Nutzereingang in diesem Verzeichnis archiviert (Git-Blob-SHAs entsprechen den lokal aus Originalbytes berechneten Blob-SHAs). Der vollständige PowerShell-Serverlog wurde zur Schonung des Git-Archivs **nicht** als 12-MB-Original committet; seine Rohdatei wurde in diesem Gespräch bereitgestellt, Auswertung unter [HOST_LOG_AUDIT.md](HOST_LOG_AUDIT.md). Bei technischer Nachprüfung Originalserverlog erneut aus der Gesprächsdatei beiziehen.

| Upload-Dateiname | Größe in Bytes | SHA-256 der Originalbytes | Git-Pfad |
|---|---:|---|---|
| Avereth Engine Test v4 - 2026-11-04@16h24m40s574ms.jsonl | 983876 | 1eb5bdaea88e860b9461a22faf4fce0cd01b1bfb2709681111f8eb719c760a48 | [originals/chat.jsonl](originals/chat.jsonl) |
| avereth-events-Avereth Engine Test v4 - 2026-11-04@16h24m40s574ms.json | 347989 | dec17a3551e232c2663b27eebc980fd55cb229276541c6a834dad869e9a154c0 | [originals/events.json](originals/events.json) |
| Userfeedback Spielgefühl.txt | 2836 | ade1979a849ffbc57069107acd38a920876e1e6ec97063c352ef194055673f46 | [originals/Userfeedback Spielgefühl.txt](originals/Userfeedback%20Spielgef%C3%BChl.txt) |
| ST_2026-11-04_16-24-04.txt | 12004086 | fe43106bedc1dabcb72232f77ff9ee01e97f23b9fcbeb1597e2b3f75ea2ac73b | **Nicht im Git; Original als Chat-Anhang** |

Merkmale: Chat JSONL 76 Zeilen einschließlich Metadaten, 75 Nachrichten. Event JSON 67 Gruppen / 635 Einzelereignisse, durch Indexabgleich vollständig mit in JSONL eingebetteten Ereignissen identisch. Hostlog UTF-16 LE mit BOM und PowerShell-Tee-Object-Ausgaben, bei Analyse korrekt als UTF-16 dekodiert. Keine Änderung des Produktbranches im Zuge dieses Reviews.
