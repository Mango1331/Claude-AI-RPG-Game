# Quellenmanifest · User11 / .208 vom 24.11.2026

Die drei Originaluploads wurden im aktuellen Chat anhand der tatsächlich zugänglichen Bytes gelesen und mit SHA-256 identifiziert. Für den Codex-Gegenreview wurden die drei Uploads erneut bereitgestellt und gegen dieses Manifest verifiziert. Die untenstehenden Dateinamen sind die Uploadnamen.

| Datei | Bytes | SHA-256 |
|---|---:|---|
| `Avereth Engine Test v4 - 2026-11-24@01h49m28s091ms.jsonl` | 425.241 | `534059d2e42c13148f35dcd58559047c4f1636e55ee5a71a0b5e6612ac991e8c` |
| `avereth-events-[_Avereth Engine Test v4.png_,_Avereth Engine Test v4 - 2026-11-24@01h49m28s091ms_].json` | 164.240 | `c76847a5b8ade424ae65e06714ea38edc5dd4cd2455c1dbacf5a947667f31b2a` |
| `ST_2026-11-24_01-48-55.txt` | 4.377.370 | `475720cd17cfb3f890db960ba913c48d65b7f2c0c3d21c63d6b8388aeff2d061` |

**Auswertungsbasis:** 28 JSONL-Records einschließlich Metadaten/Initialantwort, 25 Eventgruppen, 36 gepaarte physische API-Requests und -Responses im PowerShell-Logger (UTF-16). Der Logger enthält die Nutzlast der Modellaufrufe; keine personenbezogenen Geheimnisse oder Providerzugangsdaten in die Reviewdateien übernehmen. Die Originale sollen bei späterer Archivierung unverändert bleiben; anhand dieser Hashes kann Bytegleichheit überprüft werden.

## Ablage des Gegenreviews

[Chat](originals/chat.jsonl) und [Eventexport](originals/events.json) stimmen byteweise mit den obigen Hashes überein. Der Reviewer wertete auch das unveränderte UTF-16-ST-Log aus. Die [komprimierte Logkopie für den Review](originals/st.redacted.txt.gz) ersetzt einmal den lokalen Windows-Benutzernamen im Serverpfad durch `[local-user]`. Alle Modellrecords und ursprünglichen Zeilenenden sind erhalten. SHA-256 der entpackten, bereinigten Fassung: `b4d091087217619acc712d433f079419424eca03f85c02a7c88ad477ae5f9fcd`. Der Hash des privaten Originals steht oben.
