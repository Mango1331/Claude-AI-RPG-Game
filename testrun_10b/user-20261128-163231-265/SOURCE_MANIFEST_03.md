# User18 · Upload 3, archivierter finaler Kampagnenstand

Die drei Originale lagen Claude byteweise vor. Ihre SHA-256 stimmen mit [REVIEW_03](REVIEW_03.md) überein. Archiviert als gzip (Stufe 9, `mtime=0`) unter `originals/`, maschinenlesbar in [source_checksums.json](source_checksums.json):

| Pfad | gzip-Bytes | Inhalt (Bytes) | SHA-256 des Inhalts |
|---|---:|---:|---|
| `originals/chat.jsonl.gz` | 42.022 | 475.814 | 4f40aa45e447ee63ebccc4a46147e1670ddfcc485ceb586eb3e1c203ed21170c (= Original) |
| `originals/avereth-events.json.gz` | 15.947 | 112.950 | d238f4fd185fd7bd02cc1d3077b3288b967c442d91992accd8f4df0f0c644426 (= Original) |
| `originals/st-log.txt.gz` | 856.157 | 4.275.502 | redigierte Fassung, siehe unten |

**ST-Log:**
- **Redaktion:** Genau eine lokale Pfadangabe enthält den Windows-Benutzernamen. Nur dieser wurde durch `<redacted>` ersetzt (UTF-16LE, BOM erhalten, +10 Bytes).
- **Herkunft:** Das private Original hat 4.275.492 Bytes und den SHA-256 `de51e98e5dbf4cbfc89cef21db2939b9d5ddd87c8b8d19c9ffa587053dd8e1b2`. Dieser Hash ist nur Herkunftsangabe.
- **Weitere Inhalte:** Zugangsdaten oder Providerendpunkte enthält das Log nicht; `127.0.0.1:8000` ist der lokale ST-Server.

**Frühere Uploads:**
- Die beiden früheren ST-Logs (2.334.670 und 3.517.992 Bytes) sind **byteidentische Präfixe** des privaten finalen Logs. Ihre Manifest-Hashes sind am Präfix nachgerechnet.
- Frühere Chat- und Eventexporte sind keine Byte-Präfixe. Sie wurden neu serialisiert, ihre Hashes bleiben in [SOURCE_MANIFEST.md](SOURCE_MANIFEST.md) und [SOURCE_MANIFEST_02.md](SOURCE_MANIFEST_02.md). Inhaltlich sind sie im finalen Stand enthalten und werden nicht doppelt gespeichert.
- Die Feedbacktexte bleiben unverändert. Ihre Byteidentität ist nicht nachgewiesen.
