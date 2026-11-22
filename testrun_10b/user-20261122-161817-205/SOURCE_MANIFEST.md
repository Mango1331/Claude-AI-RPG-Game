# Quellenmanifest – User08 .205, 22.11.2026

Alle vier hochgeladenen Dateien sind **unverändert** überliefert; Git-Blob-SHA und Datei-SHA-256 sind vor Ablage an den Originalbytes geprüft. Der originale Completion-Log ist 4.594.668 Byte groß, enthält **26.396 Zeilen mit CRLF** und hat **keinen abschließenden Zeilenumbruch**. Die sechs Teile sind einfach aufeinanderfolgende Bytebereiche mit vollständigen Zeilen; die Teile 01–05 enden mit CRLF, Teil 06 ohne Abschlussnewline. `cat`/binäres Zusammenfügen ergibt die originale Datei.

| Uploadname | Repositorypfad | Bytes | SHA-256 | Git-Blob |
|---|---|---:|---|---|
| `Avereth Engine Test v4 - 2026-11-22@16h18m17s922ms.jsonl` | [`originals/chat.jsonl`](originals/chat.jsonl) | 901.895 | `d1353f4cfa29fac9b2e9ab3e4c769d5ff19d4722e82ba6d3052e4ea116c3f497` | `f553e2cfbae46a7b5609360513b2c1588db64b62` |
| `avereth-events-[_Avereth Engine Test v4.png_,_Avereth Engine Test v4 - 2026-11-22@16h18m17s922ms_].json` | [`originals/events.json`](originals/events.json) | 312.338 | `ae702a18b9f85bffcaac05a390ce0d165bf26f6491e51f6e92aceb390d744a2a` | `b5718cb9273656fdd04de70acc955f4b9f208f6c` |
| `Userfeedback Spielgefühl(8).txt` | [`originals/spielgefuehl.txt`](originals/spielgefuehl.txt) | 1.453 | `d58ed44fefdd5bdc63fef10164b31ace9db41171febae37dbdf537a3807dc6cf` | `e56d72ab84de8bea36e085e8da7e8a3f185d3075` |
| `Chat Completion request {(20261122-204132).txt` | `originals/completion-log.part01.txt` … `part06.txt` | **4.594.668** | `a11cdfad354c75faa79244247f1b2f9f8e9fb66a38eaa91a2242c33876060627` | **vollständiger Blob-SHA** `c0c063cdb2ad5907f32170cc965c38659d0e6941`; Speicherung in sechs Teilen |

## Completion-Log: Segmentbelege

| Teil | Originalzeilen (einschließlich) | Bytes | Git-Blob-SHA |
|---|---|---:|---|
| [01](originals/completion-log.part01.txt) | 1–4.500 | 741.674 | `faec98cae734caf1411c4daf0aa631b503bcf0e9` |
| [02](originals/completion-log.part02.txt) | 4.501–9.000 | 771.694 | `2a315c6c57c3f5a9f00f5f45e1d159ab1db8c6e6` |
| [03](originals/completion-log.part03.txt) | 9.001–13.500 | 801.087 | `9cc26886c3fb772758663276a1f96555125f559f` |
| [04](originals/completion-log.part04.txt) | 13.501–18.000 | 769.537 | `f333687daa1d66e32e0a4a46d57f097157dd8493` |
| [05](originals/completion-log.part05.txt) | 18.001–22.500 | 809.934 | `7eb6fa2d5ec0cece97a55cc504431954f62526e9` |
| [06](originals/completion-log.part06.txt) | 22.501–26.396 | 700.742 | `d45b70c054fd79a1ddaafc13fdc75ea8eaa66e73` |

**Rekonstruktion:** Im Verzeichnis `originals/` ausführen:

```python
from pathlib import Path
import hashlib

files = sorted(Path(".").glob("completion-log.part*.txt"))
assert len(files) == 6, "Es müssen genau sechs Teile vorliegen"
data = b"".join(p.read_bytes() for p in files)
assert len(data) == 4594668
assert hashlib.sha256(data).hexdigest() == "a11cdfad354c75faa79244247f1b2f9f8e9fb66a38eaa91a2242c33876060627"
Path("Chat Completion request {(20261122-204132).txt").write_bytes(data)
```

**Referenzen:** Bei Zahlen und spielmechanischen Behauptungen das Original-Chat-JSONL, den Eventexport und die physischen Antworten unterscheiden. Die 75 im Completion-Log mitgezählten Paare sind **nicht** ohne weitere Korrelationsprüfung als vollständige Erfassung aller 27 Narrator-/Extractorjobs zu deklarieren. Keine Bearbeitung alter, archivierter 10B-Runs oder ihrer Fingerprints.
