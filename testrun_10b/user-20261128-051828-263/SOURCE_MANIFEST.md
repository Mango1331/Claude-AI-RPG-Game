# Originalquellen User17

Alle vier Uploads direkt byteweise gelesen; SHA-256 bezieht sich auf unveränderte Uploadbytes. Der ST-Log ist UTF-16, nicht UTF-8; keine Umcodierung als Original ausgegeben. Enthält lokale Pfadangaben, vor Veröffentlichung dokumentiert redigieren. Kein Providerrequest ausgeführt.

| Uploadname | Bytes | SHA-256 | Git-Archivstatus |
|---|---:|---|---|
| Userfeedback Spielgefühl(20261128-050456).txt | 897 | dab604a7b1b566722628a632b73f6b171d8ca7bf9e308cf03c1abbe3d9d0b956 | Text separat übernommen; ursprüngliche Byteidentität nicht nachgeprüft |
| avereth-events-[_Avereth Engine Test v4.png_,_Avereth Engine Test v4 - 2026-11-28@05h18m28s255ms_].json | 104319 | 213d64baf9d9bbc4280e9f4c0d93a37139cce43f826105d53f41c41efe1175bf | Originalupload in Chat, Git-Transfer ausstehend |
| Avereth Engine Test v4 - 2026-11-28@05h18m28s255ms.jsonl | 392833 | 562259c8b1bf8c71e787ff443fcdac96d3bded1dded5176e5c11651f1a75353c | Originalupload in Chat, Git-Transfer ausstehend |
| ST_2026-11-28_05-17-57.txt | 3442686 | 9cf427576e4982ec40416a61257deb5c4caec6e42f524b45deaba35310f0867e | Originalupload in Chat, Git-Transfer ausstehend |

Die GitHub-Textschnittstelle besitzt keinen direkten Dateitransfer aus dem lokalen Uploadcontainer. Kein unvollständiger oder paraphrasierter Export als vollständiges Original. Nachtrag mit Originalen/Redaktionsnachweis erforderlich.

## Nachtrag 28.11.2026 · Claude-Gegenreview: Originale übertragen

Die drei großen Uploads lagen Claude byteweise vor und stimmen mit den obigen SHA-256 überein. Archiviert unter `originals/` (`.gitattributes`: `-text`):

| Pfad | Bytes | SHA-256 | Git-Blob |
|---|---:|---|---|
| `originals/chat.jsonl` | 392833 | 562259c8b1bf8c71e787ff443fcdac96d3bded1dded5176e5c11651f1a75353c | 73b4828b723cc806e9070b818712c4971bb7b4fa |
| `originals/avereth-events.json` | 104319 | 213d64baf9d9bbc4280e9f4c0d93a37139cce43f826105d53f41c41efe1175bf | 37b31b82a8770b9ea0e67319799fdcb18eaf2d59 |
| `originals/st-log.txt.gz` (redigiert) | 699402 | 3ef36b10f2846f2a960639e1ec4795c13e26b1ffbb5ae7ea30d50199eea3d1bd | – |

- **Redaktion:** Das Log enthält in Zeile 1 genau eine lokale Pfadangabe mit Windows-Benutzernamen. Nur der Name wurde durch `<redacted>` ersetzt. Bytes sonst unverändert, UTF-16LE-BOM erhalten.
- **Prüfwerte der redigierten Fassung:** entpackt 3.442.696 Bytes, SHA-256 `e119dd167ccfb140298cd865ad0fee0c7b856ed972b77b9027dc6f2fb9b7bdca`. Gzip mit `mtime=0`, Stufe 9.
- **Herkunftsangabe:** Der Hash des privaten Originals bleibt oben. Weitere Pfade, Schlüssel oder Providerendpunkte enthält das Log nicht; `127.0.0.1:8000` ist der lokale ST-Server.
- **Feedback:** `USER_FEEDBACK.txt` (895 Bytes, `a4b0b65169a7ad6352c8f6324d37b8e6e0e811d4ce314e72dfef381784eb99db`) ist **nicht byteidentisch** mit dem Upload (897 Bytes). Den Originalupload hatte Claude nicht. Die Datei bleibt unverändert, ihr Status in [source_checksums.json](source_checksums.json) ist `verify:false`.
- **Prüfung:** `python3 -I restore_log.py` (mit `--restore` wird das redigierte Log in ein Temp-Verzeichnis geschrieben).
