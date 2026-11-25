# Quellenmanifest User13 (.213)

Vier Originaluploads, lokal in dieser Review-Umgebung als Bytes geprüft. Chat, Events, Feedback sind in Git byteidentisch (Git-Blob-SHA gegen lokal berechneten Git-Objekthash geprüft). Einmalige Redaktion des lokalen Windows-Benutzernamens im ST-Logger; Modellrequests, Antworten, Zeitdaten und Spieltexte unverändert. Ein einfacher Mustercheck nach typischen API-/Bearer-Schlüsseln, privaten Schlüsseln und URL-Zugangsdaten ergab keine Treffer; keine umfassende Datenschutzprüfung.

| Originalupload | Bytes | SHA-256 | Ablage |
|---|---:|---|---|
| Avereth Engine Test v4 - 2026-11-25@21h21m54s302ms.jsonl | 359367 | fb43b0468c72d9028289dcda806968079bda35d0978afa2d17b5ff5afb3346e3 | originals/chat.jsonl |
| avereth-events-[_Avereth Engine Test v4.png_,_Avereth Engine Test v4 - 2026-11-25@21h21m54s302ms_].json | 144766 | 351f99c534db6e1b6f0264bb4ff963abbaaeb85e2ee5ce4ef8dd8737421d801e | originals/avereth-events.json |
| ST_2026-11-25_21-06-33.txt | 3208720 | 522c38795c10361fdc8cf3025f361fd09879befce18b02a47fc28f1d9ff0b2b2 | originals/st-log-parts/ (redigiert) |
| Userfeedback Spielgefühl(10).txt | 341 | 3c707ed9d987b94d721a5f4f548359e6ec122bad8b25a0419f0f389fd60df0bd | originals/feedback.txt |

## ST-Log: vollständige redigierte Kopie

UTF-16LE mit BOM, ursprüngliche CRLF beibehalten, 9337 Zeilen. Ausschließlich einmal den Windows-Benutzernamen durch <redacted> ersetzt. Redigierte Größe **3208730 Bytes**, SHA-256 **2e738bdd11dd0c2c30cec90d060ad207e2fa29be5b2f2c220d75791376799caf**, Git-Blob-SHA der wieder zusammengesetzten Datei **607bbda6be941460e786c977e6079100ce081093**.

Die einzelne große Blobübertragung überschritt die verfügbare Connector-Transportgrenze. Deshalb sind die redigierten Originalbytes in neun geordneten Binärteilen gespeichert; jeder Teil stimmt bytegenau anhand des vorab aus der lokalen Quelle berechneten Git-Blob-SHA mit dem übertragenen Objekt überein. Keine gekürzte oder rekonstruierte Narration.

| Teil | Bytes | Git-Blob-SHA |
|---|---:|---|
| 01.bin | 400000 | 2f81d186647a466e27091e69014eb2abb9325ba9 |
| 02.bin | 400000 | 3d1ba13fb6ce34fb9ac79fbb01f692898dece088 |
| 03.bin | 400000 | 111fb50a84f7b8646e018a666f44b7c97bf9423d |
| 04.bin | 400000 | b6fca360a45fb34d96069e1aff0482e01c8030dd |
| 05.bin | 400000 | bb71bea17d3970c7e5a3017ebf8bccc5c025a6b0 |
| 06.bin | 400000 | e4d444189e70a3e1dedab6bec9a1a8fa5089fdc4 |
| 07.bin | 400000 | 684a2dbba3eefdeee830650d9cb8459359a5a154 |
| 08.bin | 400000 | 241cdf7ac2ce776c7f97967176480a924fec4bd6 |
| 09.bin | 8730 | 2b4921b3fb4d7126c6e1e6dfa9f4c9127dd2f063 |

Rekonstruktion ohne weitere Downloads oder Modellaufrufe: im Runordner `python restore_log.py` (alternativ `py restore_log.py`). Das Skript validiert alle drei übrigen Dateien und die neun Teile und schreibt die wieder zusammengesetzte ST-Log-Datei in einen lokalen temporären Ordner außerhalb des Git-Repos. Existierende Originaluploads werden nicht überschrieben.

Die nachträgliche Anmerkung zu situativer Kapitulation und optionalem Wurf stammt aus der Nutzer-Nachricht im GPT-Chat und ist separat in FEEDBACK_SPIELGEFUEHL.md übernommen; sie ist nicht Teil des ursprünglichen TXT-Uploads.
