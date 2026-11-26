# Quellenmanifest User14 (.215)

Alle vier Uploads aus dem 26.11.2026 direkt als Originalbytes gelesen und SHA-256 lokal berechnet. Die drei kleinen Quellen wurden anhand der lokal errechneten Git-Blob-SHA bytegenau übertragen. Das ST-Log ist vollständig erhalten, mit dokumentierter einmaliger Redaktion des lokalen Windows-Benutzernamens. Mustercheck des Logs auf typische OpenRouter-/Bearer-Schlüssel, private Schlüssel und URL-Zugangsdaten ohne Treffer; keine umfassende Datenschutzprüfung.

| Originalname | Bytes | SHA-256 | Git-Ablage |
|---|---:|---|---|
| Avereth Engine Test v4 - 2026-11-26@01h03m32s717ms.jsonl | 400798 | 7f927dbcb5a77b5dd8970f1934beb4be8fadcb84cc38d5444db49c27a1713f22 | originals/chat.jsonl |
| avereth-events-[_Avereth Engine Test v4.png_,_Avereth Engine Test v4 - 2026-11-26@01h03m32s717ms_].json | 139489 | 1f62c25248efc780c8ecd46b92902d7d5917b9c54f16e92e08eea56690b16107 | originals/avereth-events.json |
| Userfeedback Spielgefühl(20261126-011221).txt | 1144 | 2d27de3fcec65f091ae3951dc5086c8e3c0e444579280f8e1ac1a61f714f8da6 | originals/feedback.txt |
| ST_2026-11-26_01-03-11.txt | 4595766 | 11e46d1b3e1fa652d0a2ecd67fa4fe97bb20ca22354942b3a69b908e7eb56e7b | originals/st-log-parts/ (redigiert) |

Redigierte Kopie: UTF-16LE mit BOM und originalen CRLF, 12409 Textzeilen, Schluss-CRLF erhalten. Genau ein lokaler Benutzerpfad enthält nun <redacted>. Bytes 4595776, SHA-256 00fe6ff4e04c7f06895a33453a9615c5b7efa7f10a76c0c116f438f217fdaed1, Git-Blob-SHA 9d64ecf6fc0657620ed3e049e8627a564b44913b.

Wegen der Connector-Transportgrenze in zwölf geordnete Binärteile unter originals/st-log-parts/ aufgeteilt. Jeder übertragene Blob stimmt mit dem lokal errechneten Git-Objekthash überein.

| Datei | Bytes | Git-Blob-SHA |
|---|---:|---|
| 01.bin | 400000 | 609a602110527c5116615cf9a2e12e763afcd305 |
| 02.bin | 400000 | 789d9565c5ca2bd9da5579f9dda7020e0d132e52 |
| 03.bin | 400000 | be51c0e911c13e93bc645af6c93da7942c04919f |
| 04.bin | 400000 | ee41c6333e93dea0ffa83065b542ad47bda6b714 |
| 05.bin | 400000 | f1447a972c06a43079db61a0ab5f54148dd1849b |
| 06.bin | 400000 | af03329930c14cb40729cbdc60d2f6e4862ac81a |
| 07.bin | 400000 | 192ad706fee0130c3b088a269fc386a0bc67eda0 |
| 08.bin | 400000 | 4ce7b3f1bac3d47fe5a0ff026f8aae3608ad6dbb |
| 09.bin | 400000 | 75dd30c5c5b07e33fe5dd9db1d128a97b124eed1 |
| 10.bin | 400000 | 95bc27227a78850f1cf8e7bdcbf702662ae2569f |
| 11.bin | 400000 | 71fb5d14b8f8d954f210b8540262dc3fe0e1c6f8 |
| 12.bin | 195776 | 724eb073d639e572a7d36ff91a1078b6ea260673 |

Im Runordner `python restore_log.py` (Windows alternativ `py restore_log.py`) ausführen. Das Skript prüft die drei kleinen Originaldateien, alle zwölf Teile und den zusammengesetzten SHA-256. Es schreibt das redigierte Original-ST-Log in einen temporären Ordner außerhalb des Repos und überschreibt keine vorhandenen Originale. Kein erneuter Upload notwendig. Die .gitattributes erhält die Originalbytes auch bei Windows-Checkouts.
