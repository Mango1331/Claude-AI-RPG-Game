# Natürliche Ortsketten .264 · Old Crown Catacombs

Die fünf Läufe starteten aus verifizierten Präfixen von [User17](../user-20261128-051828-263/README.md) in einer isolierten SillyTavern-1.19-Installation. Jeder neue Zug wurde über den tatsächlichen Host an GLM-5.3-Flash (OpenRouter, Wafer) gesendet und bis zur Speicherung beobachtet. Die Serie umfasst auch zwei Zwischenstände mit reproduzierten Fehlern. [Befunde, Korrekturen und technische Abnahme](../../recherche/AVERETH_264_ORTSIDENTITAET_USER17_KONSOLIDIERUNG_ABNAHME.md)

| Lauf | Originalpräfix | Züge | Physische Requests | Abgerechnete USD |
|---|---|---:|---:|---:|
| [Route](Route/SOURCE_MANIFEST.json) | bis M14, Gilde | 2 | 6 | 0,003946392 |
| [Ford](Ford/SOURCE_MANIFEST.json) | bis M16, Straße | 3 | 9 | 0,005680150 |
| [Crossing](Crossing/SOURCE_MANIFEST.json) | gleiches M16 | 3 | 9 | 0,005706188 |
| [Shrine](Shrine/SOURCE_MANIFEST.json) | gleiches M16 | 2 | 6 | 0,003640984 |
| [Bank](Bank/SOURCE_MANIFEST.json) | gleiches M16 | 5 | 15 | 0,009121560 |
| **Gesamt** | | **15** | **45** | **0,028095274** |

Jedes Manifest enthält den getesteten Git-Commit und SHA-256 für jede komprimierte Datei. `parent-check` bindet Nachrichten und gefalteten Weltzustand vor dem ersten Request. `requests` ordnet Start, Requestbody, Antwortdatei, physische Generation, Rolle, Token, Kosten und Laufzeit einander zu. `raw-*.gz` enthält den empfangenen Responsebody. `actions`, `turns`, Chat, Eventexport und letzter gefalteter Weltzustand erlauben die Gegenprüfung der Spielerentscheidungen und Buchungen. `profile` beschreibt das Testprofil. Ausschließlich lokale Pfadbestandteile des ST-Logs sind laut Manifest ersetzt. Kostenobergrenze der gesamten Serie war 0,50 USD, alle begonnenen Requests sind abgerechnet.
